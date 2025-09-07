import {useEffect, useRef, useState} from "react";

function LowLevelControlsTab() {
    const [layers, setLayers] = useState([]);
    const [pumpOn, setPumpOn] = useState(false);
    const [pumpPower, setPumpPower] = useState(50);
    const [loading, setLoading] = useState(false);
    const [additiveNames, setAdditiveNames] = useState(["Additive 1", "Additive 2", "Additive 3", "Additive 4"]);
    const backend_uri = "http://bioreactor.local:8000";

    // new states
    const [peristaltics, setPeristaltics] = useState([
        {id: 0, on: false},
        {id: 1, on: false},
        {id: 2, on: false},
        {id: 3, on: false},
    ]);
    const [reservoirMixingOn, setReservoirMixingOn] = useState(false);
    const [additiveMixingOn, setAdditiveMixingOn] = useState(false);

    // debounce for main pump power
    const debounceTimeout = useRef(null);

    function updateFromBackendState(backend_state) {
        setLayers(backend_state.layers || []);
        setPumpOn(backend_state.pump_on);
        setPumpPower(backend_state.pump_power);
        setPeristaltics((prev) =>
            prev.map((p) => ({
                ...p, // keep id and anything else
                on: backend_state.peristaltics[p.id].on,
            }))
        );
        setReservoirMixingOn(backend_state.reservoir_mixing_on);
        setAdditiveMixingOn(backend_state.additive_mixing_on);
    }

    function updateFromBackendConfig(backend_config) {
        setAdditiveNames(backend_config.additive_names || ["Additive 1", "Additive 2", "Additive 3", "Additive 4"]);
    }

    // Fetch state once and periodically
    useEffect(() => {
        const fetchState = () => {
            fetch(backend_uri + "/get-state")
                .then((res) => res.json())
                .then(updateFromBackendState)
                .catch((err) => console.error("Error fetching state:", err));
        };

        const fetchConfig = () => {
            fetch(backend_uri + "/get-config")
                .then((res) => res.json())
                .then(updateFromBackendConfig)
                .catch((err) => console.error("Error fetching config:", err));
        }

        fetchState();
        fetchConfig();
        const interval = setInterval(fetchState, 5000);
        return () => clearInterval(interval);
    }, []);

    // --- Handlers ---
    const handleValveToggle = (id) => {
        if (loading) return;
        setLoading(true);
        fetch(backend_uri + `/switch-valve/${id}`, {method: "POST"})
            .then((res) => res.json())
            .then((data) => {
                setLayers((prev) =>
                    prev.map((layer) =>
                        layer.id_ === id
                            ? {...layer, valve_on: data.new_valve_on}
                            : layer
                    )
                );
            })
            .finally(() => setLoading(false));
    };

    const handleLightToggle = (id) => {
        if (loading) return;
        setLoading(true);
        fetch(backend_uri + `/switch-light/${id}`, {method: "POST"})
            .then((res) => res.json())
            .then((data) => {
                setLayers((prev) =>
                    prev.map((layer) =>
                        layer.id_ === id
                            ? {...layer, light_on: data.new_light_on}
                            : layer
                    )
                );
            })
            .finally(() => setLoading(false));
    };

    const handlePumpToggle = () => {
        if (loading) return;
        setLoading(true);
        fetch(backend_uri + "/toggle-pump", {method: "POST"})
            .then((res) => res.json())
            .then((data) => setPumpOn(data.new_pump_on))
            .finally(() => setLoading(false));
    };

    const handlePumpPowerChange = (value) => {
        setPumpPower(value);
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(() => {
            fetch(backend_uri + `/pump-power-change/${value}`, {method: "POST"})
                .then((res) => res.json())
                .catch((err) => console.error("Error setting pump power:", err));
        }, 300);
    };

    const handlePeristalticToggle = (id) => {
        setPeristaltics((prev) =>
            prev.map((p) => (p.id === id ? {...p, on: !p.on} : p))
        );
        fetch(backend_uri + `/toggle-peristaltic/${id}`, {method: "POST"})
            .then((res) => res.json())
            .then((res) => {
                setPeristaltics((prev) =>
                    prev.map((p) => (p.id === id ? {...p, on: res.new_peristaltic_on} : p))
                );
            })
            .catch(
                (err) => console.error("Error toggling peristaltic:", err)
            );
    };

    const handleReservoirMixingToggle = () => {
        setReservoirMixingOn((prev) => !prev);
        fetch(backend_uri + "/toggle-reservoir-mixing", {
            method: "POST",
        })
            .then((res) => res.json())
            .then((res) => setReservoirMixingOn(res.new_reservoir_mixing_on))
            .catch((err) =>
                console.error("Error toggling reservoir mixing:", err)
            );
    };

    const handleAdditiveMixingToggle = () => {
        setAdditiveMixingOn((prev) => !prev);
        fetch(backend_uri + "/toggle-additive-mixing", {
            method: "POST",
        })
            .then((res) => res.json())
            .then((res) => setAdditiveMixingOn(res.new_additive_mixing_on))
            .catch((err) =>
                console.error("Error toggling additive mixing:", err)
            );
    };

    const handleMeasurement = (type) => {
        fetch(backend_uri + `/trigger-measurement/${type}`, {method: "POST"})
            .then((res) => res.json())
            .then((data) => console.log("Measurement triggered:", data))
            .catch((err) => console.error("Error triggering measurement:", err));
    };

    const handleFailSafe = () => {
        if (loading) return;
        setLoading(true);
        fetch(backend_uri + "/turn-everything-off", {method: "POST"})
            .then((response) => response.json())
            .then(updateFromBackendState)
            .then(() => setLoading(false))
            .catch((error) => {
                setLoading(false);
                console.error("Error turning everything off:", error);
            });
    };

    // --- UI ---
    return (
        <div className="w-full max-w-3xl space-y-8">
            {/* Layers */}
            <div className="space-y-4">
                {layers.map((layer) => (
                    <div
                        key={layer.id_}
                        className="flex items-center justify-between bg-white p-4 rounded-lg shadow"
                    >
                        <div>
                            <p className="font-semibold text-gray-800">{layer.name}</p>
                            {/*<p className="text-sm text-gray-500">ID={layer.id_}</p>*/}
                        </div>

                        <div className="flex space-x-4">
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={layer.valve_on}
                                    onChange={() => handleValveToggle(layer.id_)}
                                    disabled={loading}
                                    className="w-6 h-6 accent-green-600"
                                />
                                <span>Valve</span>
                            </label>

                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={layer.light_on}
                                    onChange={() => handleLightToggle(layer.id_)}
                                    disabled={loading}
                                    className="w-6 h-6 accent-yellow-500"
                                />
                                <span>Light</span>
                            </label>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pump */}
            <button
                onClick={handlePumpToggle}
                disabled={loading}
                className="w-full py-4 bg-green-600 text-white text-xl rounded-lg shadow hover:bg-green-700"
            >
                {pumpOn ? "⏹ Stop Pump" : "▶ Run Pump"}
            </button>

            {/* Pump power slider */}
            <div className="bg-white p-6 rounded-lg shadow">
                <label className="block mb-3 font-semibold text-gray-700">
                    Pump Power
                </label>
                <div className="flex items-center space-x-4">
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={pumpPower}
                        onChange={(e) => handlePumpPowerChange(Number(e.target.value))}
                        className="slider-thumb"
                    />
                    <span className="text-xl font-bold text-gray-700">{pumpPower}</span>
                </div>
            </div>

            {/* Peristaltic pumps */}
            <div className="bg-white p-6 rounded-lg shadow space-y-4">
                <h2 className="font-semibold text-lg text-gray-800">
                    Additive dosing controls
                </h2>
                <div className="grid grid-cols-2 gap-4">
                    {peristaltics.map((p) => (
                        <label
                            key={p.id}
                            className="p-4 border rounded-lg flex items-center justify-between cursor-pointer"
                        >
                            <span>{additiveNames[p.id]}</span>
                            <input
                                type="checkbox"
                                checked={p.on}
                                onChange={() => handlePeristalticToggle(p.id)}
                                className="w-5 h-5 accent-green-600"
                            />
                        </label>
                    ))}
                </div>
            </div>


            {/* Mixing reservoir + Additive mixing */}
            <div className="bg-white p-6 rounded-lg shadow space-y-4">
                <h2 className="font-semibold text-lg text-gray-800">
                    Reservoir & Additives mixing
                </h2>
                <div className="flex justify-between">
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={reservoirMixingOn}
                            onChange={handleReservoirMixingToggle}
                            className="w-6 h-6 accent-blue-600"
                        />
                        <span>Run Reservoir Mixing</span>
                    </label>
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={additiveMixingOn}
                            onChange={handleAdditiveMixingToggle}
                            className="w-6 h-6 accent-purple-600"
                        />
                        <span>Run Additive Mixing</span>
                    </label>
                </div>
            </div>

            {/* Measurement triggers */}
            <div className="flex justify-between space-x-4">
                <button
                    onClick={() => handleMeasurement("ph-cond")}
                    className="flex-1 py-4 border-2 border-green-600 text-green-700 font-semibold rounded-lg hover:bg-green-100"
                >
                    Measure pH and conductivity
                </button>
                <button
                    onClick={() => handleMeasurement("probe")}
                    className="flex-1 py-4 border-2 border-blue-600 text-blue-700 font-semibold rounded-lg hover:bg-blue-100"
                >
                    Measure PROBE
                </button>
            </div>

            {/* Fail-safe */}
            <div>
                <button
                    onClick={handleFailSafe}
                    className="w-full py-6 border-2 border-red-600 text-red-700 text-2xl font-bold rounded-lg hover:bg-red-100"
                    disabled={loading}
                >
                    🚨 Turn everything OFF
                </button>
            </div>
        </div>
    );
}

export default LowLevelControlsTab;
