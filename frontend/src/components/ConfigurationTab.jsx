import {useEffect, useState} from "react";

function ConfigurationTab() {
    const backend_uri = "http://bioreactor.local:8000";

    const [lightStart, setLightStart] = useState("05:00");
    const [lightEnd, setLightEnd] = useState("21:00");
    const [probePeriod, setProbePeriod] = useState(60);
    const [mixingPeriod, setMixingPeriod] = useState(10);
    const [mixingIntensity, setMixingIntensity] = useState(50);
    const [mixingDuration, setMixingDuration] = useState(5);
    const [saving, setSaving] = useState(false);

    // Fetch existing config when loading
    useEffect(() => {
        fetch(backend_uri + "/get-config")
            .then((res) => res.json())
            .then((data) => {
                setLightStart(data.light_cycle_start || "05:00");
                setLightEnd(data.light_cycle_end || "21:00");
                setProbePeriod(data.probe_reading_period_minutes || 60);
                setMixingPeriod(data.medium_mixing_period_minutes || 10);
                setMixingIntensity(data.medium_mixing_intensity || 50);
                setMixingDuration(data.medium_mixing_duration_seconds || 5);
            })
            .catch((err) => console.error("Error fetching config:", err));
    }, []);

    // Utility to enforce positive integers
    const enforcePositiveInt = (value, fallback = 1) => {
        const n = parseInt(value, 10);
        return isNaN(n) || n < 1 ? fallback : n;
    };

    const handleSave = () => {
        setSaving(true);
        const body = {
            light_cycle_start: lightStart,
            light_cycle_end: lightEnd,
            probe_reading_period_minutes: probePeriod,
            medium_mixing_period_minutes: mixingPeriod,
            medium_mixing_intensity: mixingIntensity,
            medium_mixing_duration_seconds: mixingDuration,
        };

        fetch(backend_uri + "/set-config", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(body),
        })
            .then((res) => res.json())
            .then((data) => {
                console.log("Config updated:", data);
            })
            .finally(() => setSaving(false));
    };

    return (
        <div className="w-full max-w-2xl space-y-6">
            <h2 className="text-2xl font-bold text-green-700">System Configuration</h2>

            {/* Light cycle */}
            <div className="bg-white p-6 rounded-lg shadow space-y-4">
                <h3 className="text-lg font-semibold">Light Cycle</h3>
                <div className="flex space-x-4">
                    <div className="flex flex-col">
                        <label className="font-medium">Start</label>
                        <input
                            type="time"
                            value={lightStart}
                            onChange={(e) => setLightStart(e.target.value)}
                            className="border rounded p-2"
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="font-medium">End</label>
                        <input
                            type="time"
                            value={lightEnd}
                            onChange={(e) => setLightEnd(e.target.value)}
                            className="border rounded p-2"
                        />
                    </div>
                </div>
            </div>

            {/* Probe readings */}
            <div className="bg-white p-6 rounded-lg shadow space-y-2">
                <h3 className="text-lg font-semibold">Probe Readings</h3>
                <label className="flex items-center space-x-2">
                    <span>Period (minutes):</span>
                    <input
                        type="number"
                        min="1" step="1"
                        value={probePeriod}
                        onChange={(e) => setProbePeriod(enforcePositiveInt(e.target.value, probePeriod))}
                        className="border rounded p-2 w-24"
                    />
                </label>
            </div>

            {/* Medium mixing */}
            <div className="bg-white p-6 rounded-lg shadow space-y-4">
                <h3 className="text-lg font-semibold">Medium Mixing</h3>
                <label className="flex items-center space-x-2">
                    <span>Period (minutes):</span>
                    <input
                        type="number"
                        min="1" step="1"
                        value={mixingPeriod}
                        onChange={(e) => setMixingPeriod(enforcePositiveInt(e.target.value, mixingPeriod))}
                        className="border rounded p-2 w-24"
                    />
                </label>

                <label className="flex items-center space-x-2">
                    <span className="mb-2">Intensity:</span>
                    <input
                        type="number"
                        min="1" step="1"
                        value={mixingIntensity}
                        onChange={(e) => setMixingIntensity(enforcePositiveInt(e.target.value, mixingIntensity))}
                        className="border rounded p-2 w-24"
                    />
                </label>

                <label className="flex items-center space-x-2">
                    <span className="mb-2">Duration (seconds):</span>
                    <input
                        type="number"
                        min="1" step="1"
                        value={mixingDuration}
                        onChange={(e) => setMixingDuration(enforcePositiveInt(e.target.value, mixingDuration))}
                        className="border rounded p-2 w-24"
                    />
                </label>
            </div>

            {/* Save button */}
            <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 bg-green-600 text-white text-lg rounded-lg shadow hover:bg-green-700"
            >
                {saving ? "Saving..." : "💾 Save Configuration"}
            </button>
        </div>
    );
}

export default ConfigurationTab;
