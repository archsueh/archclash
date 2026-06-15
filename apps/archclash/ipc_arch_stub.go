//go:build !windows && !darwin

package main

import "context"

func windowsEnsureArchIPCReachable(ctx context.Context) error {
	_ = ctx
	return nil
}

func ipcArchStartClash(ctx context.Context, p archIPCStartParams) error {
	_ = ctx
	_ = p
	return nil
}

func ipcArchStopCore(ctx context.Context) error {
	_ = ctx
	return nil
}
