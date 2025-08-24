import {useEffect, useState} from "react";

function HighLevelControlsTab() {
    const [layers, setLayers] = useState([]);
    const [loading, setLoading] = useState(false);

    const backend_uri = "http://192.168.0.102:8000";

    // Fetch state once and periodically
    useEffect(() => {
        const fetchState = () => {
            fetch(backend_uri + "/get-state")
                .then((res) => res.json())
                .then((data) => {
                    setLayers(data.layers || []);
                })
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
        if (loading) return;  // TODO DELETE
        setLoading(true);
        fetch(backend_uri + "/toggle-auto", {method: "POST"})
            .then((response) => response.json())
            .then(() => setLoading(false))// TODO DELETE
            .catch((error) => {
                setLoading(false);
                console.error("Error toggling auto cultivation:", error);
            });
    };

    const handleAllLightsToggle = () => {
        if (loading) return;
        setLoading(true);
        fetch(backend_uri + "/toggle-all-lights", {method: "POST"})
            .then((response) => response.json())
            .then(() => setLoading(false))
            .catch((error) => {
                setLoading(false);
                console.error("Error toggling all lights:", error);
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
                    🔄 Toggle Auto Cultivation
                </button>
            </div>

            {/* All Lights Toggle */}
            <div>
                <button
                    onClick={handleAllLightsToggle}
                    className="w-full py-6 bg-yellow-500 text-white text-2xl font-semibold rounded-lg shadow-md hover:bg-yellow-600"
                    disabled={loading}
                >
                    💡 Toggle All Lights
                </button>
            </div>

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
