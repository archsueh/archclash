package main

import "testing"

func TestApplyProfileScriptInjectsRule(t *testing.T) {
	doc := map[string]any{
		"rules": []any{"MATCH,DIRECT"},
	}
	script := `
function main(config) {
  if (!config.rules) config.rules = [];
  config.rules.unshift('DOMAIN,example.com,DIRECT');
  return config;
}`
	if err := applyProfileScript(doc, script); err != nil {
		t.Fatalf("applyProfileScript: %v", err)
	}
	rules, ok := doc["rules"].([]any)
	if !ok || len(rules) == 0 {
		t.Fatalf("rules missing after script")
	}
	if rules[0] != "DOMAIN,example.com,DIRECT" {
		t.Fatalf("first rule = %v", rules[0])
	}
}

func TestApplyProfileScriptEmptyNoOp(t *testing.T) {
	doc := map[string]any{"mode": "rule"}
	if err := applyProfileScript(doc, ""); err != nil {
		t.Fatalf("empty script should no-op: %v", err)
	}
}