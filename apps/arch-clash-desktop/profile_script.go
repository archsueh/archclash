package main

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/dop251/goja"
)

// applyProfileScript runs a Mihomo Party–style override script against doc.
// Scripts must define `function main(config) { ... return config; }`.
func applyProfileScript(doc map[string]any, script string) error {
	script = strings.TrimSpace(script)
	if script == "" || doc == nil {
		return nil
	}

	raw, err := json.Marshal(doc)
	if err != nil {
		return fmt.Errorf("override script encode: %w", err)
	}

	vm := goja.New()
	if _, err := vm.RunString(script); err != nil {
		return fmt.Errorf("override script compile: %w", err)
	}
	if _, ok := goja.AssertFunction(vm.Get("main")); !ok {
		return fmt.Errorf("override script: main(config) function is required")
	}
	wrapped := fmt.Sprintf(`(function(){ const __cfg = %s; const __out = main(__cfg); return JSON.stringify(__out ?? __cfg); })()`, string(raw))
	val, err := vm.RunString(wrapped)
	if err != nil {
		return fmt.Errorf("override script run: %w", err)
	}
	outJSON := val.String()
	if strings.TrimSpace(outJSON) == "" {
		return nil
	}
	var out map[string]any
	if err := json.Unmarshal([]byte(outJSON), &out); err != nil {
		return fmt.Errorf("override script decode: %w", err)
	}
	for k := range doc {
		delete(doc, k)
	}
	for k, v := range out {
		doc[k] = v
	}
	return nil
}