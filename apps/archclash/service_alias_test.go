package main

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func TestLinkLegacyServiceAliases(t *testing.T) {
	dir := t.TempDir()
	ext := ""
	if runtime.GOOS == "windows" {
		ext = ".exe"
	}
	canonical := filepath.Join(dir, "arch-clash-service"+ext)
	if err := os.WriteFile(canonical, []byte("stub"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := linkLegacyServiceAliases(dir); err != nil {
		t.Fatal(err)
	}
	legacy := filepath.Join(dir, "sloth-clash-service"+ext)
	if st, err := os.Stat(legacy); err != nil {
		t.Fatalf("expected legacy alias: %v", err)
	} else if st.Mode()&os.ModeSymlink != 0 {
		t.Fatalf("expected legacy alias to be a copied file, got symlink")
	}
}