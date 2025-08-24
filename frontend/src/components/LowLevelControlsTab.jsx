import {useEffect, useRef, useState} from "react";

function LowLevelControlsTab() {
    const [layers, setLayers] = useState([]);
    const [pumpOn, setPumpOn] = useState(false);
    const [pumpPower, setPumpPower] = useState(50);
    const [loading, setLoading] = useState(false);
    const backend_uri = "http://bioreactor.local:8000";

    // keep debounce timeout in ref so it persists across renders
    const debounceTimeout = useRef(null);

    function updateFromBackendState(backend_state) {
        // Update the UI components based on the given state of the backend.
        setLayers(backend_state.layers || []);
        setPumpOn(backend_state.pump_on);
        setPumpPower(backend_state.pump_power);
    }

    // Fetch state once and periodically
    useEffect(() => {
        const fetchState = () => {
            fetch(backend_uri + "/get-state")
                .then((res) => res.json())
                .then(updateFromBackendState)
                .catch((err) => console.error("Error fetching state:", err));
        };

        fetchState();
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

    // Debounced slider
    const handlePumpPowerChange = (value) => {
        setPumpPower(value); // update UI instantly

        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

        debounceTimeout.current = setTimeout(() => {
            fetch(backend_uri + `/pump-power-change/${value}`, {method: "POST"})
                .then((res) => res.json())
                .catch((err) => console.error("Error setting pump power:", err));
        }, 300); // send only after 300ms of no changes
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
        <div className="w-full max-w-2xl space-y-6">
            {/* Layers */}
            <div className="space-y-4">
                {layers.map((layer) => (
                    <div
                        key={layer.id_}
                        className="flex items-center justify-between bg-white p-4 rounded-lg shadow"
                    >
                        <div>
                            <p className="font-semibold text-gray-800">{layer.name}</p>
                            <p className="text-sm text-gray-500">ID={layer.id_}</p>
                        </div>

                        <div className="flex space-x-4">
                            {/* Valve toggle */}
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

                            {/* Light toggle */}
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

            {/* Pump toggle */}
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

            {/* Fail-safe button */}
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
