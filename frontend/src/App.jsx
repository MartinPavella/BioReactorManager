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
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            <h1 className="mb-6">Nitroduck BioReactor</h1>

            {/* Tabs */}
            <div className="flex space-x-4 mb-6">
                <button
                    onClick={() => setActiveTab("controls")}
                    className={`px-4 py-2 rounded ${activeTab === "controls" ? "bg-green-600 text-white" : "bg-gray-300"}`}
                >
                    Controls
                </button>
                <button
                    onClick={() => setActiveTab("charts")}
                    className={`px-4 py-2 rounded ${activeTab === "charts" ? "bg-green-600 text-white" : "bg-gray-300"}`}
                >
                    Charts
                </button>
            </div>

            {/* Controls tab */}
            {activeTab === "controls" && (
                <div className="w-full max-w-md">
                    {/* Full Harvest Button */}
                    <div className="mb-6">
                        <button
                            onClick={handleFullHarvestClick}
                            className="px-10 py-4 bg-green-600 text-white text-2xl rounded hover:bg-green-700"
                            disabled={loading}
                        >
                            Full Harvest
                        </button>
                    </div>

                    {/* Layer controls */}
                    {layers.map((layer) => (
                        <div
                            key={layer.id_}
                            className="flex items-center justify-between bg-white p-4 mb-3 rounded-lg shadow"
                        >
                            <label>
                                <span className="teal-text">{layer.name}</span>
                                <span className="grey-text"> (ID={layer.id_})</span>
                            </label>

                            <label className="ml-4 flex items-center">
                                <input
                                    type="checkbox"
                                    checked={layer.valve_state}
                                    onChange={() => handleValveCheckboxChange(layer.id_)}
                                    disabled={loading}
                                    className="mr-2"
                                />
                                Valve
                            </label>
                        </div>
                    ))}

                    {/* Pump toggle */}
                    <div className="mt-6">
                        <button
                            onClick={handlePumpToggle}
                            className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700"
                            disabled={loading}
                        >
                            {pumpState ? "Stop pump" : "Run pump"}
                        </button>
                    </div>

                    {/* Pump power slider */}
                    <div className="mt-6">
                        <span>{sliderValue} : </span>
                        <input
                            id="slider"
                            type="range"
                            min="0"
                            max="100"
                            className="slider"
                            value={sliderValue}
                            onChange={handleChangeSlider}
                        />
                    </div>
                </div>
            )}

            {/* Charts tab */}
            {activeTab === "charts" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
                    {/* Render 5 charts */}
                    {[0, 1, 2, 3, 4].map((layerId) => (
                        <LineChart key={layerId} layerId={layerId}/>
                    ))}
                </div>
            )}
        </div>
    );
};

export default App;
