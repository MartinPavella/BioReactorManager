import React, {useEffect, useState} from "react";
import LineChart from "./components/LineGraph.jsx";
import "./App.css";

const App = () => {
    const [layers, setLayers] = useState([]);
    const [pumpState, setPumpState] = useState(false);
    const [loading, setLoading] = useState(false);
    const [sliderValue, setSliderValue] = useState(50);
    const [activeTab, setActiveTab] = useState("controls"); // NEW state for tab navigation

    const backend_uri = "http://192.168.0.102:8000";

    // --- Effects for fetching backend state ---
    useEffect(() => {
        fetch(backend_uri + "/get-state")
            .then((response) => response.json())
            .then((data) => setLayers(data))
            .catch((error) => console.error("Error fetching layer data:", error));
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            fetch(backend_uri + "/get-state")
                .then((response) => response.json())
                .then((data) => setLayers(data))
                .catch((error) => console.error("Error fetching layer data:", error));
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // --- Handlers ---
    const handleValveCheckboxChange = (id) => {
        if (loading) return;
        fetch(backend_uri + `/switch-valve/${id}`, {method: "POST"})
            .then((response) => response.json())
            .then((data) => {
                setLayers((prevLayers) =>
                    prevLayers.map((layer) =>
                        layer.id_ === id ? {...layer, valve_state: data.new_valve_state} : layer
                    )
                );
            })
            .catch((error) => console.error("Error updating valve:", error));
    };

    const handlePumpToggle = () => {
        if (loading) return;
        fetch(backend_uri + "/toggle-pump", {method: "POST"})
            .then((response) => response.json())
            .then((data) => {
                setPumpState(data.new_pump_state);
            })
            .catch((error) => console.error("Error toggling pump state:", error));
    };

    const handleFullHarvestClick = () => {
        if (loading) return;
        setLoading(true);
        fetch(backend_uri + "/harvest-all", {method: "POST"})
            .then((response) => response.json())
            .then(() => setLoading(false))
            .catch((error) => {
                setLoading(false);
                console.error("Error sending harvest request:", error);
            });
    };

    const handleChangeSlider = (e) => {
        fetch(backend_uri + `/pump-power-change/${Number(e.target.value)}`, {method: "POST"})
            .then((response) => response.json())
            .then((data) => setSliderValue(Number(data.value)))
            .catch((error) => console.error("Error adjusting slider:", error));
    };

    // --- UI ---
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 space-y-8">
            <h1 className="text-4xl font-extrabold text-green-700">Nitroduck BioReactor</h1>

            {/* Tabs */}
            <div className="flex space-x-4">
                <button
                    onClick={() => setActiveTab("controls")}
                    className={`px-6 py-3 rounded-lg text-lg font-semibold ${
                        activeTab === "controls" ? "bg-green-600 text-white" : "bg-gray-300 text-gray-800"
                    }`}
                >
                    Controls
                </button>
                <button
                    onClick={() => setActiveTab("charts")}
                    className={`px-6 py-3 rounded-lg text-lg font-semibold ${
                        activeTab === "charts" ? "bg-green-600 text-white" : "bg-gray-300 text-gray-800"
                    }`}
                >
                    Charts
                </button>
            </div>

            {/* Controls tab */}
            {activeTab === "controls" && (
                <div className="w-full max-w-md space-y-8">
                    {/* Full Harvest Button */}
                    <div>
                        <button
                            onClick={handleFullHarvestClick}
                            className="w-full py-8 bg-green-600 text-white text-3xl font-bold rounded-lg shadow-lg hover:bg-green-700"
                            disabled={loading}
                        >
                            🌱 Full Harvest
                        </button>
                    </div>

                    {/* Layer controls */}
                    <div className="space-y-4">
                        {layers.map((layer) => (
                            <div
                                key={layer.id_}
                                className="flex items-center justify-between bg-white p-5 rounded-lg shadow-md"
                            >
                                <div>
                                    <p className="text-lg font-semibold text-gray-800">{layer.name}</p>
                                    <p className="text-sm text-gray-500">ID={layer.id_}</p>
                                </div>

                                <label className="flex items-center space-x-3">
                                    <input
                                        type="checkbox"
                                        checked={layer.valve_state}
                                        onChange={() => handleValveCheckboxChange(layer.id_)}
                                        disabled={loading}
                                        className="w-7 h-7 accent-green-600"
                                    />
                                    <span className="text-lg font-medium">Valve</span>
                                </label>
                            </div>
                        ))}
                    </div>

                    {/* Pump toggle */}
                    <button
                        onClick={handlePumpToggle}
                        className="w-full py-6 bg-green-600 text-white text-2xl font-semibold rounded-lg shadow-md hover:bg-green-700"
                        disabled={loading}
                    >
                        {pumpState ? "⏹ Stop Pump" : "▶ Run Pump"}
                    </button>

                    {/* Pump power slider */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <label htmlFor="slider" className="block mb-4 text-xl font-semibold text-gray-700">
                            Pump Power
                        </label>
                        <div className="flex items-center space-x-4">
                            <input
                                id="slider"
                                type="range"
                                min="0"
                                max="100"
                                className="w-full h-3 rounded-lg appearance-none bg-green-300 accent-green-600 cursor-pointer"
                                value={sliderValue}
                                onChange={handleChangeSlider}
                            />
                            <span className="text-lg font-bold text-gray-700">{sliderValue}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Charts tab */}
            {activeTab === "charts" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
                    {[0, 1, 2, 3, 4].map((layerId) => (
                        <LineChart key={layerId} layerId={layerId}/>
                    ))}
                </div>
            )}
        </div>
    );


};

export default App;
