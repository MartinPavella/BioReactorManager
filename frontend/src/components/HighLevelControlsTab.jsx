import {useEffect, useState} from "react";


function HighLevelControlsTab() {
    const [layers, setLayers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [automaticCultivationOn, setAutomaticCultivationOn] = useState(false);

    const backend_uri = "http://bioreactor.local:8000";

    function updateFromBackendState(backend_state) {
        // Update the UI components based on the given state of the backend.
        setLayers(backend_state.layers || []);
        setAutomaticCultivationOn(backend_state.automatic_cultivation_on);
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
    const handleFullHarvestClick = () => {
        // TODO Not working currently!

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

    const handleAutoCultivationToggle = () => {
        if (loading) return;
        setLoading(true);
        fetch(backend_uri + "/toggle-automatic-cultivation", {method: "POST"})
            .then((response) => response.json())
            .then((data) => {
                setAutomaticCultivationOn(data.new_automatic_cultivation_on)
            })
            .then(() => setLoading(false))
            .catch((error) => {
                setLoading(false);
                console.error("Error toggling auto cultivation:", error);
            });
    };

    const handleAllLightsOn = () => {
        if (loading) return;
        setLoading(true);
        fetch(backend_uri + "/all-lights-on", {method: "POST"})
            .then((response) => response.json())
            .then(() => setLoading(false))
            .catch((error) => {
                setLoading(false);
                console.error("Error turning all lights ON:", error);
            });
    };

    const handleAllLightsOff = () => {
        if (loading) return;
        setLoading(true);
        fetch(backend_uri + "/all-lights-off", {method: "POST"})
            .then((response) => response.json())
            .then(() => setLoading(false))
            .catch((error) => {
                setLoading(false);
                console.error("Error turning all lights OFF:", error);
            });
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

    const handleHarvestLayer = (id) => {
        if (loading) return;
        setLoading(true);
        fetch(backend_uri + `/harvest-layer/${id}`, {method: "POST"})
            .then((response) => response.json())
            .then(() => setLoading(false))
            .catch((error) => {
                setLoading(false);
                console.error("Error harvesting layer:", error);
            });
    };

    return (
        <div className="w-full max-w-md space-y-8">


            {/* Automatic Cultivation */}
            <div>
                <button
                    onClick={handleAutoCultivationToggle}
                    className="w-full py-6 bg-blue-600 text-white text-2xl font-semibold rounded-lg shadow-md hover:bg-blue-700"
                    disabled={loading}
                >
                    <b>{automaticCultivationOn ? "⏹ STOP" : "▶ START"}</b> Autonomous Cultivation
                </button>
            </div>

            {/* All Lights Controls */}
            <div className="space-y-6">
                {/* On/Off buttons side by side */}
                <div className="flex space-x-4">
                    <button
                        onClick={handleAllLightsOn}
                        className="flex-1 py-6 bg-yellow-500 text-white text-2xl font-semibold rounded-lg shadow-md hover:bg-yellow-600"
                        disabled={loading}
                    >
                        ☀ Lights ON
                    </button>
                    <button
                        onClick={handleAllLightsOff}
                        className="flex-1 py-6 bg-gray-500 text-white text-2xl font-semibold rounded-lg shadow-md hover:bg-gray-600"
                        disabled={loading}
                    >
                        🌑 Lights OFF
                    </button>
                </div>
            </div>

            {/* Full Harvest Button */}
            <div>
                <button
                    onClick={handleFullHarvestClick}
                    className="w-full py-8 bg-green-600 text-white text-2xl font-bold rounded-lg shadow-lg hover:bg-green-700"
                    disabled={loading}
                >
                    🌱 Full Harvest
                </button>
            </div>

            {/* Fail-safe button */}
            <div>
                <button
                    onClick={handleFailSafe}
                    className="w-full py-8 bg-red-600 text-white text-2xl font-bold rounded-lg shadow-lg hover:bg-red-700"
                    disabled={loading}
                >
                    🚨 Turn everything OFF
                </button>
            </div>

            {/* Harvest Individual Layers */}
            <div className="space-y-4">
                {layers.map((layer) => (
                    <div
                        key={layer.id_}
                        className="flex items-center justify-between bg-gray-500 p-5 rounded-lg shadow-md"
                    >
                        <div>
                            <p className="text-lg font-semibold text-white">{layer.name}</p>
                            {/*{<p className="text-sm text-gray-400">ID={layer.id_}</p>}*/}
                        </div>
                        <button
                            onClick={() => handleHarvestLayer(layer.id_)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                            disabled={loading}
                        >
                            Harvest
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default HighLevelControlsTab;
