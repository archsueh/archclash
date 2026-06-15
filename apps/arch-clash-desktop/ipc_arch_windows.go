//go:build windows

package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os/exec"
	"strings"
	"time"

	"github.com/Microsoft/go-winio"
)

const (
	archWindowsServicePipe = `\\.\pipe\arch-clash-service`
	archIPCHeaderMagic      = "X-IPC-Magic"
	archIPCAuthExpect       = `Like as the waves make towards the pebbl'd shore, So do our minutes hasten to their end;`
	archWindowsSCMService   = "arch_clash_service"
)

type ipcEnvelope struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

func ipcArchServiceClient() *http.Client {
	return &http.Client{
		Transport: &http.Transport{
			DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
				return winio.DialPipeContext(ctx, archWindowsServicePipe)
			},
			DisableKeepAlives: true,
		},
		Timeout: 30 * time.Second,
	}
}

func ipcArchDo(ctx context.Context, method, path string, body []byte) (status int, bodyOut []byte, err error) {
	cli := ipcArchServiceClient()
	var rdr io.Reader
	if len(body) > 0 {
		rdr = bytes.NewReader(body)
	}
	req, err := http.NewRequestWithContext(ctx, method, "http://arch"+path, rdr)
	if err != nil {
		return 0, nil, err
	}
	req.Header.Set(archIPCHeaderMagic, archIPCAuthExpect)
	if len(body) > 0 {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := cli.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	b, err := io.ReadAll(io.LimitReader(resp.Body, 512*1024))
	return resp.StatusCode, b, err
}

func windowsEnsureArchIPCReachable(ctx context.Context) error {
	dctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	c, err := winio.DialPipeContext(dctx, archWindowsServicePipe)
	if err == nil {
		_ = c.Close()
		return nil
	}

	qctx, qcancel := context.WithTimeout(ctx, 8*time.Second)
	defer qcancel()
	qcmd := exec.CommandContext(qctx, system32Exe("sc.exe"), "query", archWindowsSCMService)
	if attr := hideWindowSysProcAttr(); attr != nil {
		qcmd.SysProcAttr = attr
	}
	out, qerr := qcmd.CombinedOutput()
	if qerr != nil {
		return fmt.Errorf("Arch IPC service pipe not reachable (%v); is `%s` installed and running? (sc query: %w)\n%s", err, archWindowsSCMService, qerr, strings.TrimSpace(string(out)))
	}
	lower := strings.ToLower(string(out))
	if !strings.Contains(lower, "running") {
		ncmd := exec.CommandContext(qctx, system32Exe("net.exe"), "start", archWindowsSCMService)
		if attr := hideWindowSysProcAttr(); attr != nil {
			ncmd.SysProcAttr = attr
		}
		_, _ = ncmd.CombinedOutput()
	}

	rctx, rcancel := context.WithTimeout(ctx, 5*time.Second)
	defer rcancel()
	c2, err2 := winio.DialPipeContext(rctx, archWindowsServicePipe)
	if err2 != nil {
		return fmt.Errorf("Arch IPC pipe still unreachable after attempting to start `%s`: %w (original dial: %v)", archWindowsSCMService, err2, err)
	}
	_ = c2.Close()
	return nil
}

func ipcArchStartClash(ctx context.Context, p archIPCStartParams) error {
	payload := map[string]any{
		"core_config": map[string]string{
			"core_path":      p.CorePath,
			"core_ipc_path":  p.CoreIpcPath,
			"config_path":    p.ConfigPath,
			"config_dir":     p.ConfigDir,
		},
		"log_config": map[string]any{
			"directory":     p.LogDirectory,
			"max_log_size":  10 * 1024 * 1024,
			"max_log_files": 8,
		},
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	st, b, err := ipcArchDo(ctx, http.MethodPost, "/clash/start", raw)
	if err != nil {
		return err
	}
	var env ipcEnvelope
	_ = json.Unmarshal(b, &env)
	if st < 200 || st >= 300 {
		if env.Message != "" {
			return fmt.Errorf("POST /clash/start: HTTP %d — %s", st, env.Message)
		}
		return fmt.Errorf("POST /clash/start: HTTP %d — %s", st, strings.TrimSpace(string(b)))
	}
	if env.Code != 0 {
		if env.Message != "" {
			return fmt.Errorf("start core via service: %s", env.Message)
		}
		return fmt.Errorf("start core via service: code %d", env.Code)
	}
	return nil
}

func ipcArchStopCore(ctx context.Context) error {
	st, b, err := ipcArchDo(ctx, http.MethodDelete, "/clash/stop", nil)
	if err != nil {
		return err
	}
	var env ipcEnvelope
	_ = json.Unmarshal(b, &env)
	if st < 200 || st >= 300 {
		if env.Message != "" {
			return fmt.Errorf("DELETE /clash/stop: HTTP %d — %s", st, env.Message)
		}
		return fmt.Errorf("DELETE /clash/stop: HTTP %d — %s", st, strings.TrimSpace(string(b)))
	}
	if env.Code != 0 {
		if env.Message != "" {
			return fmt.Errorf("stop core via service: %s", env.Message)
		}
		return fmt.Errorf("stop core via service: code %d", env.Code)
	}
	return nil
}
