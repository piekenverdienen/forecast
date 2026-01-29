"use client";

import { useState, useEffect } from "react";

// Type definitions
interface Settings {
  hourlyRate: number;
}

const DEFAULT_SETTINGS: Settings = {
  hourlyRate: 85, // Standaard uurtarief in euro's
};

export default function InstellingenPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Laad instellingen bij mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("forecast-settings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
      } catch (e) {
        console.error("Fout bij laden instellingen:", e);
      }
    }
  }, []);

  // Update hourly rate
  const handleHourlyRateChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setSettings((prev) => ({ ...prev, hourlyRate: numValue }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  // Opslaan naar localStorage (vervang dit door je eigen API call)
  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Sla op in localStorage
      localStorage.setItem("forecast-settings", JSON.stringify(settings));

      // TODO: Hier kun je een API call toevoegen om het uurtarief
      // te updaten voor alle projecten in je database:
      //
      // await fetch('/api/settings/hourly-rate', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ hourlyRate: settings.hourlyRate })
      // });

      setSaveSuccess(true);
      setHasChanges(false);

      // Dispatch event zodat andere componenten kunnen luisteren
      window.dispatchEvent(
        new CustomEvent("settings-updated", { detail: settings })
      );
    } catch (error) {
      console.error("Fout bij opslaan:", error);
      alert("Er ging iets mis bij het opslaan. Probeer het opnieuw.");
    } finally {
      setIsSaving(false);
    }
  };

  // Toepassen op alle projecten
  const handleApplyToAllProjects = async () => {
    const confirmed = window.confirm(
      `Weet je zeker dat je het uurtarief van €${settings.hourlyRate.toFixed(2)} wilt toepassen op ALLE projecten en opdrachten?\n\nDit overschrijft alle individuele uurtarieven.`
    );

    if (!confirmed) return;

    setIsSaving(true);

    try {
      // TODO: Vervang dit door je eigen API call:
      //
      // await fetch('/api/projects/update-all-rates', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ hourlyRate: settings.hourlyRate })
      // });

      // Simuleer API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      alert(
        `Het uurtarief van €${settings.hourlyRate.toFixed(2)} is toegepast op alle projecten.`
      );
    } catch (error) {
      console.error("Fout bij toepassen:", error);
      alert("Er ging iets mis. Probeer het opnieuw.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Instellingen</h1>
          <p className="mt-2 text-gray-600">
            Beheer je standaard instellingen voor het hele platform.
          </p>
        </div>

        {/* Uurtarief sectie */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Uurtarief</h2>
            <p className="text-sm text-gray-500">
              Stel het standaard uurtarief in voor alle projecten en opdrachten.
            </p>
          </div>

          <div className="px-6 py-6 space-y-6">
            {/* Uurtarief input */}
            <div>
              <label
                htmlFor="hourlyRate"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Standaard uurtarief
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">€</span>
                </div>
                <input
                  type="number"
                  id="hourlyRate"
                  name="hourlyRate"
                  min="0"
                  step="0.01"
                  value={settings.hourlyRate}
                  onChange={(e) => handleHourlyRateChange(e.target.value)}
                  className="block w-full pl-8 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  placeholder="0.00"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">per uur</span>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Dit tarief wordt gebruikt als standaard voor nieuwe projecten.
              </p>
            </div>

            {/* Toepassen op alle projecten */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-start space-x-4">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">
                    Toepassen op alle projecten
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Pas het uurtarief van €{settings.hourlyRate.toFixed(2)} toe
                    op alle bestaande projecten en opdrachten. Dit overschrijft
                    alle individuele uurtarieven.
                  </p>
                </div>
                <button
                  onClick={handleApplyToAllProjects}
                  disabled={isSaving}
                  className="flex-shrink-0 px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSaving ? "Bezig..." : "Toepassen op alles"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Opslaan knop */}
        <div className="mt-6 flex items-center justify-between">
          <div>
            {saveSuccess && (
              <p className="text-sm text-green-600 flex items-center">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Instellingen opgeslagen
              </p>
            )}
            {hasChanges && !saveSuccess && (
              <p className="text-sm text-amber-600">
                Je hebt niet-opgeslagen wijzigingen
              </p>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? "Opslaan..." : "Instellingen opslaan"}
          </button>
        </div>

        {/* Extra uitleg */}
        <div className="mt-8 bg-blue-50 rounded-lg p-4 border border-blue-100">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            Hoe werkt het uurtarief?
          </h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>
              • Het <strong>standaard uurtarief</strong> wordt automatisch
              toegepast op nieuwe projecten.
            </li>
            <li>
              • Gebruik <strong>"Toepassen op alles"</strong> om het tarief te
              synchroniseren naar alle bestaande projecten.
            </li>
            <li>
              • Na het toepassen hebben alle projecten, opdrachten en
              abonnementen hetzelfde uurtarief.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Helper hook om het uurtarief te gebruiken in andere componenten
export function useHourlyRate(): number {
  const [hourlyRate, setHourlyRate] = useState<number>(85);

  useEffect(() => {
    // Laad initieel
    const savedSettings = localStorage.getItem("forecast-settings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setHourlyRate(parsed.hourlyRate || 85);
      } catch (e) {
        console.error("Fout bij laden uurtarief:", e);
      }
    }

    // Luister naar updates
    const handleSettingsUpdate = (event: CustomEvent) => {
      setHourlyRate(event.detail.hourlyRate || 85);
    };

    window.addEventListener(
      "settings-updated",
      handleSettingsUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        "settings-updated",
        handleSettingsUpdate as EventListener
      );
    };
  }, []);

  return hourlyRate;
}
