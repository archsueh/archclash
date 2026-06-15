//go:build darwin

package main

import (
	"os/exec"
	"strings"
)

// detectConflictingProxyApps returns other desktop proxy clients that may
// compete for TUN / system routing when ArchClash connects.
func detectConflictingProxyApps() []string {
	out, err := exec.Command("ps", "-axo", "comm=").Output()
	if err != nil {
		return nil
	}
	needles := []struct {
		match string
		label string
	}{
		{"Clash Party", "Clash Party"},
		{"mihomo-party", "Clash Party"},
		{"FlClash", "FlClash"},
		{"clash-verge", "Clash Verge"},
	}
	seen := map[string]bool{}
	var hits []string
	for _, line := range strings.Split(string(out), "\n") {
		l := strings.TrimSpace(line)
		if l == "" || strings.Contains(l, "ArchClash") {
			continue
		}
		for _, n := range needles {
			if strings.Contains(l, n.match) && !seen[n.label] {
				seen[n.label] = true
				hits = append(hits, n.label)
			}
		}
	}
	return hits
}