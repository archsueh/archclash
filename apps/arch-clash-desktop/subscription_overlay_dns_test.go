package main

import "testing"

func TestEnsureDNSFallbackFillsEmptyList(t *testing.T) {
	dns := map[string]any{"enable": true, "fallback": []any{}}
	ensureDNSFallback(dns)
	fb, ok := dns["fallback"].([]any)
	if !ok || len(fb) == 0 {
		t.Fatalf("fallback should be populated, got %v", dns["fallback"])
	}
	ff, ok := dns["fallback-filter"].(map[string]any)
	if !ok || ff["geoip-code"] != "CN" {
		t.Fatalf("fallback-filter missing geoip-code CN: %v", dns["fallback-filter"])
	}
}