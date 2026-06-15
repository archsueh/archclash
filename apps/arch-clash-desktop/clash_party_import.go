package main

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

type clashPartyProfileIndex struct {
	Items []struct {
		ID       string   `yaml:"id"`
		Name     string   `yaml:"name"`
		Type     string   `yaml:"type"`
		URL      string   `yaml:"url"`
		Override []string `yaml:"override"`
	} `yaml:"items"`
	Current string `yaml:"current"`
}

func clashPartyDataDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, "Library", "Application Support", "mihomo-party"), nil
}

func readClashPartyOverrideScript(overrideIDs []string) (string, error) {
	root, err := clashPartyDataDir()
	if err != nil {
		return "", err
	}
	for _, id := range overrideIDs {
		id = strings.TrimSpace(id)
		if id == "" {
			continue
		}
		p := filepath.Join(root, "override", id+".js")
		b, err := os.ReadFile(p)
		if err == nil && len(strings.TrimSpace(string(b))) > 0 {
			return string(b), nil
		}
	}
	return "", nil
}

// ImportFromClashParty imports remote subscriptions and the active override
// script from ~/Library/Application Support/mihomo-party/ (Clash Party).
func (a *App) ImportFromClashParty() (AppState, error) {
	root, err := clashPartyDataDir()
	if err != nil {
		return a.GetAppState(), err
	}
	indexPath := filepath.Join(root, "profile.yaml")
	b, err := os.ReadFile(indexPath)
	if err != nil {
		return a.GetAppState(), fmt.Errorf("Clash Party profile.yaml not found: %w", err)
	}
	var idx clashPartyProfileIndex
	if err := yaml.Unmarshal(b, &idx); err != nil {
		return a.GetAppState(), fmt.Errorf("parse Clash Party profile.yaml: %w", err)
	}
	if len(idx.Items) == 0 {
		return a.GetAppState(), errors.New("Clash Party has no profiles to import")
	}

	a.mu.Lock()
	urlToID := map[string]string{}
	for _, p := range a.profiles {
		if strings.TrimSpace(p.URL) != "" {
			urlToID[strings.TrimSpace(p.URL)] = p.ID
		}
	}

	var imported []string
	for _, item := range idx.Items {
		if strings.TrimSpace(item.Type) != "remote" || strings.TrimSpace(item.URL) == "" {
			continue
		}
		url := strings.TrimSpace(item.URL)
		if _, exists := urlToID[url]; exists {
			continue
		}
		name := strings.TrimSpace(item.Name)
		if name == "" {
			name = "Clash Party"
		}
		p := Profile{
			ID:                        "profile-" + time.Now().Format("20060102150405") + "-" + strings.TrimSpace(item.ID),
			Name:                      name,
			Type:                      "subscription",
			URL:                       url,
			LastUpdated:               time.Now().Unix(),
			AutoUpdateEnabled:         true,
			AutoUpdateIntervalMinutes: defaultProfileAutoUpdateMinutes,
		}
		a.profiles = append(a.profiles, p)
		urlToID[url] = p.ID
		imported = append(imported, name)
	}

	activeID := ""
	current := strings.TrimSpace(idx.Current)
	for _, item := range idx.Items {
		if item.ID == current {
			url := strings.TrimSpace(item.URL)
			if id, ok := urlToID[url]; ok {
				activeID = id
			}
			if script, serr := readClashPartyOverrideScript(item.Override); serr == nil && strings.TrimSpace(script) != "" {
				for i := range a.profiles {
					if a.profiles[i].ID == activeID {
						a.profiles[i].ScriptTemplate = script
						break
					}
				}
			}
			break
		}
	}

	if activeID != "" {
		a.state.Profile.ActiveProfileID = activeID
	}
	a.state.Profile.Profiles = a.profiles
	a.state.UpdatedAt = time.Now().Unix()
	if err := a.persistProfilesLocked(); err != nil {
		a.mu.Unlock()
		return a.state, err
	}
	a.mu.Unlock()

	if len(imported) == 0 && activeID == "" {
		return a.GetAppState(), errors.New("nothing new to import — subscriptions may already exist")
	}
	a.emitAppStateChanged()
	return a.GetAppState(), nil
}