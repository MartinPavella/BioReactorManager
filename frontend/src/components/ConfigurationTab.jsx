import {useEffect, useState} from "react";

function ConfigurationTab() {
    const backend_uri = "http://bioreactor.local:8000";

    const [cultivationStart, setCultivationStart] = useState("05:00");
    const [cultivationEnd, setCultivationEnd] = useState("21:00");
    const [probePeriod, setProbePeriod] = useState(60);
    const [mediumPeriod, setMediumPeriod] = useState(60);

    // Layer mixing
    const [layerMixingPeriod, setLayerMixingPeriod] = useState(10);
    const [layerMixingIntensity, setLayerMixingIntensity] = useState(50);
    const [layerMixingDuration, setLayerMixingDuration] = useState(5);

    // Reservoir mixing
    const [reservoirMixingPeriod, setReservoirMixingPeriod] = useState(10);
    const [reservoirMixingDuration, setReservoirMixingDuration] = useState(5);

    // Additives
    const [additiveNames, setAdditiveNames] = useState(["Additive 1", "Additive 2", "Additive 3", "Additive 4"]);

    // Additive refreshing
    const [targetPH, setTargetPH] = useState(7.0);
    const [phTolerance, setPhTolerance] = useState(0.1);
    const [targetEC, setTargetEC] = useState(1.5);
    const [ecTolerance, setEcTolerance] = useState(0.1);
    const [additiveDoses, setAdditiveDoses] = useState([1, 1, 1, 1]); // per additive
    const [additiveIntegrationMixingSeconds, setAdditiveIntegrationMixingSeconds] = useState(10);

    const [saving, setSaving] = useState(false);

    // Fetch existing config
    useEffect(() => {
        fetch(backend_uri + "/get-config")
            .then((res) => res.json())
            .then((data) => {
                setCultivationStart(data.cultivation_cycle_start || "05:00");
                setCultivationEnd(data.cultivation_cycle_end || "21:00");
                setProbePeriod(data.probe_reading_period_minutes || 60);
                setMediumPeriod(data.medium_reading_period_minutes || 60);

                // Layer mixing
                setLayerMixingPeriod(data.layer_mixing_period_minutes || 10);
                setLayerMixingIntensity(data.layer_mixing_intensity || 50);
                setLayerMixingDuration(data.layer_mixing_duration_seconds || 5);

                // Reservoir mixing
                setReservoirMixingPeriod(data.reservoir_mixing_period_minutes || 10);
                setReservoirMixingDuration(data.reservoir_mixing_duration_seconds || 5);

                setAdditiveNames(data.additive_names || ["Additive 1", "Additive 2", "Additive 3", "Additive 4"]);

                // Additive refreshing
                setTargetPH(data.target_ph ?? 7.0);
                setPhTolerance(data.ph_tolerance ?? 0.1);
                setTargetEC(data.target_ec ?? 1.5);
                setEcTolerance(data.ec_tolerance ?? 0.1);
                setAdditiveDoses(data.additive_doses || [1, 1, 1, 1]);
                setAdditiveIntegrationMixingSeconds(data.additive_integration_mixing_seconds || 10);
            })
            .catch((err) => console.error("Error fetching config:", err));
    }, []);

    // Utils
    const enforcePositiveInt = (value, fallback = 1) => {
        const n = parseInt(value, 10);
        return isNaN(n) || n < 1 ? fallback : n;
    };

    const enforcePositiveFloat = (value, fallback = 0) => {
        const n = parseFloat(value);
        return isNaN(n) || n <= 0 ? fallback : n;
    };

    const handleSave = () => {
        setSaving(true);
        const body = {
            cultivation_cycle_start: cultivationStart,
            cultivation_cycle_end: cultivationEnd,
            probe_reading_period_minutes: probePeriod,
            medium_reading_period_minutes: mediumPeriod,

            // Layer mixing
            layer_mixing_period_minutes: layerMixingPeriod,
            layer_mixing_intensity: layerMixingIntensity,
            layer_mixing_duration_seconds: layerMixingDuration,

            // Reservoir mixing
            reservoir_mixing_period_minutes: reservoirMixingPeriod,
            reservoir_mixing_duration_seconds: reservoirMixingDuration,

            additive_names: additiveNames,

            // Additive refreshing
            target_ph: targetPH,
            ph_tolerance: phTolerance,
            target_ec: targetEC,
            ec_tolerance: ecTolerance,
            additive_doses: additiveDoses,
            additive_integration_mixing_seconds: additiveIntegrationMixingSeconds
        };

        fetch(backend_uri + "/set-config", {
            method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)
        })
            .then((res) => res.json())
            .then((data) => {
                console.log("Config updated:", data);
            })
            .finally(() => setSaving(false));
    };

    const handleAdditiveNameChange = (index, value) => {
        setAdditiveNames((prev) => {
            const updated = [...prev];
            updated[index] = value;
            return updated;
        });
    };

    const handleAdditiveDoseChange = (index, value) => {
        setAdditiveDoses((prev) => {
            const updated = [...prev];
            updated[index] = enforcePositiveFloat(value, prev[index]);
            return updated;
        });
    };

    return (<div className="w-full max-w-2xl space-y-6">
        <h2 className="text-2xl font-bold text-green-700">System Configuration</h2>

        {/* Cultivation cycle */}
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <h3 className="text-lg font-semibold">Cultivation Cycle</h3>
            <div className="flex space-x-4">
                <div className="flex flex-col">
                    <label className="font-medium">Start</label>
                    <input
                        type="time"
                        value={cultivationStart}
                        onChange={(e) => setCultivationStart(e.target.value)}
                        className="border rounded p-2"
                    />
                </div>
                <div className="flex flex-col">
                    <label className="font-medium">End</label>
                    <input
                        type="time"
                        value={cultivationEnd}
                        onChange={(e) => setCultivationEnd(e.target.value)}
                        className="border rounded p-2"
                    />
                </div>
            </div>
        </div>

        {/* Sensor readings */}
        <div className="bg-white p-6 rounded-lg shadow space-y-2">
            <h3 className="text-lg font-semibold">Sensor Readings</h3>
            <label className="flex items-center space-x-2">
                <span>Biomass reading period (minutes):</span>
                <input
                    type="number"
                    min="1"
                    step="1"
                    value={probePeriod}
                    onChange={(e) => setProbePeriod(enforcePositiveInt(e.target.value, probePeriod))}
                    className="border rounded p-2 w-24"
                />
            </label>

            <label className="flex items-center space-x-2">
                <span>Medium reading period (minutes):</span>
                <input
                    type="number"
                    min="1"
                    step="1"
                    value={mediumPeriod}
                    onChange={(e) => setMediumPeriod(enforcePositiveInt(e.target.value, mediumPeriod))}
                    className="border rounded p-2 w-24"
                />
            </label>
        </div>

        {/* Layer Mixing */}
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <h3 className="text-lg font-semibold">Layer Mixing</h3>
            <label className="flex items-center space-x-2">
                <span>Period (minutes):</span>
                <input
                    type="number"
                    min="1"
                    step="1"
                    value={layerMixingPeriod}
                    onChange={(e) => setLayerMixingPeriod(enforcePositiveInt(e.target.value, layerMixingPeriod))}
                    className="border rounded p-2 w-24"
                />
            </label>
            <label className="flex items-center space-x-2">
                <span>Intensity:</span>
                <input
                    type="number"
                    min="1"
                    step="1"
                    value={layerMixingIntensity}
                    onChange={(e) => setLayerMixingIntensity(enforcePositiveInt(e.target.value, layerMixingIntensity))}
                    className="border rounded p-2 w-24"
                />
            </label>
            <label className="flex items-center space-x-2">
                <span>Duration (seconds):</span>
                <input
                    type="number"
                    min="1"
                    step="1"
                    value={layerMixingDuration}
                    onChange={(e) => setLayerMixingDuration(enforcePositiveInt(e.target.value, layerMixingDuration))}
                    className="border rounded p-2 w-24"
                />
            </label>
        </div>

        {/* Reservoir Mixing */}
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <h3 className="text-lg font-semibold">Reservoir Mixing</h3>
            <label className="flex items-center space-x-2">
                <span>Period (minutes):</span>
                <input
                    type="number"
                    min="1"
                    step="1"
                    value={reservoirMixingPeriod}
                    onChange={(e) => setReservoirMixingPeriod(enforcePositiveInt(e.target.value, reservoirMixingPeriod))}
                    className="border rounded p-2 w-24"
                />
            </label>
            <label className="flex items-center space-x-2">
                <span>Duration (seconds):</span>
                <input
                    type="number"
                    min="1"
                    step="1"
                    value={reservoirMixingDuration}
                    onChange={(e) => setReservoirMixingDuration(enforcePositiveInt(e.target.value, reservoirMixingDuration))}
                    className="border rounded p-2 w-24"
                />
            </label>
        </div>

        {/* Additive Names */}
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <h3 className="text-lg font-semibold">Additive Names</h3>
            {additiveNames.map((name, idx) => (<label key={idx} className="flex items-center space-x-2">
                <span>Additive {idx + 1}:</span>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => handleAdditiveNameChange(idx, e.target.value)}
                    className="border rounded p-2 flex-1"
                />
            </label>))}
        </div>

        {/* Additive Refreshing */}
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <h3 className="text-lg font-semibold">Additive Refreshing</h3>

            <div className="flex space-x-4">
                <label className="flex flex-col">
                    <span>Target pH:</span>
                    <input
                        type="number"
                        step="0.1"
                        value={targetPH}
                        onChange={(e) => setTargetPH(enforcePositiveFloat(e.target.value, targetPH))}
                        className="border rounded p-2 w-24"
                    />
                </label>
                <label className="flex flex-col">
                    <span>pH tolerance ±:</span>
                    <input
                        type="number"
                        step="0.01"
                        value={phTolerance}
                        onChange={(e) => setPhTolerance(enforcePositiveFloat(e.target.value, phTolerance))}
                        className="border rounded p-2 w-24"
                    />
                </label>
            </div>

            <div className="flex space-x-4">
                <label className="flex flex-col">
                    <span>Target EC (mS/cm):</span>
                    <input
                        type="number"
                        step="0.1"
                        value={targetEC}
                        onChange={(e) => setTargetEC(enforcePositiveFloat(e.target.value, targetEC))}
                        className="border rounded p-2 w-24"
                    />
                </label>
                <label className="flex flex-col">
                    <span>EC tolerance ±:</span>
                    <input
                        type="number"
                        step="0.01"
                        value={ecTolerance}
                        onChange={(e) => setEcTolerance(enforcePositiveFloat(e.target.value, ecTolerance))}
                        className="border rounded p-2 w-24"
                    />
                </label>
            </div>

            <div className="space-y-2">
                <p className="font-medium">Additive doses per refresh (mL):</p>
                {additiveNames.map((name, idx) => (<label key={idx} className="flex items-center space-x-2">
                    <span>{name}:</span>
                    <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={additiveDoses[idx]}
                        onChange={(e) => handleAdditiveDoseChange(idx, e.target.value)}
                        className="border rounded p-2 w-24"
                    />
                </label>))}
            </div>

            <label className="flex items-center space-x-2">
                <span>Mixing duration after dosing (seconds):</span>
                <input
                    type="number"
                    min="1"
                    step="1"
                    value={additiveIntegrationMixingSeconds}
                    onChange={(e) => setAdditiveIntegrationMixingSeconds(enforcePositiveInt(e.target.value, additiveIntegrationMixingSeconds))}
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
    </div>);
}

export default ConfigurationTab;
