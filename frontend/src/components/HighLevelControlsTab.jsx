import {useEffect, useState} from "react";

function HighLevelControlsTab() {
    const [layers, setLayers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [automaticCultivationOn, setAutomaticCultivationOn] = useState(false);

    const backend_uri = "http://bioreactor.local:8000";

    function updateFromBackendState(backend_state) {
        setLayers(backend_state.layers || []);
        setAutomaticCultivationOn(backend_state.automatic_cultivation_on);
    }

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

    const handleFullHarvestClick = () => {
        if (loading) return;
        setLoading(true);
        fetch(backend_uri + "/harvest-all", {method: "POST"})
            .then((response) => response.json())
            .finally(() => setLoading(false));
    };

    const handleAutoCultivationToggle = () => {
        if (loading) return;
        setLoading(true);
        fetch(backend_uri + "/toggle-automatic-cultivation", {method: "POST"})
            .then((response) => response.json())
            .then((data) => {
                setAutomaticCultivationOn(data.new_automatic_cultivation_on);
            })
            .finally(() => setLoading(false));
    };

    const handleAllLightsOn = () => {
        if (loading) return;
        setLoading(true);
        fetch(backend_uri + "/all-lights-on", {method: "POST"})
            .then((response) => response.json())
            .finally(() => setLoading(false));
    };

    const handleAllLightsOff = () => {
        if (loading) return;
        setLoading(true);
        fetch(backend_uri + "/all-lights-off", {method: "POST"})
            .then((response) => response.json())
            .finally(() => setLoading(false));
    };

    const handleFailSafe = () => {
        if (loading) return;
        setLoading(true);
        fetch(backend_uri + "/turn-everything-off", {method: "POST"})
            .then((response) => response.json())
            .then(updateFromBackendState)
            .finally(() => setLoading(false));
    };

    const handleHarvestLayer = (id) => {
        if (loading) return;
        setLoading(true);
        fetch(backend_uri + `/harvest-layer/${id}`, {method: "POST"})
            .then((response) => response.json())
            .finally(() => setLoading(false));
    };

    return (
        <div className="w-full max-w-md space-y-8">

            {/* Autonomous Cultivation */}
            <div>
                <button
                    onClick={handleAutoCultivationToggle}
                    className="w-full py-6 bg-green-600 text-white text-2xl font-semibold rounded-lg shadow-md hover:bg-green-700"
                    disabled={loading}
                >
                    <b>{automaticCultivationOn ? "⏹ STOP" : "▶ START"}</b> Autonomous Cultivation
                </button>
            </div>

            {/* All Lights Controls */}
            <div className="flex space-x-4">
                <button
                    onClick={handleAllLightsOn}
                    className="flex-1 py-4 border-2 border-yellow-500 text-yellow-600 text-xl font-semibold rounded-lg hover:bg-yellow-100"
                    disabled={loading}
                >
                    ☀ Lights ON
                </button>
                <button
                    onClick={handleAllLightsOff}
                    className="flex-1 py-4 border-2 border-gray-500 text-gray-600 text-xl font-semibold rounded-lg hover:bg-gray-300"
                    disabled={loading}
                >
                    🌑 Lights OFF
                </button>
            </div>

            {/* Full Harvest Button */}
            <div>
                <button
                    onClick={handleFullHarvestClick}
                    className="w-full py-6 border-2 border-green-600 text-green-700 text-2xl font-bold rounded-lg hover:bg-green-100"
                    disabled={loading}
                >
                    🌱 Full Harvest
                </button>
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

            {/* Harvest Individual Layers */}
            <div className="space-y-3">
                {layers.map((layer) => (
                    <div
                        key={layer.id_}
                        className="flex items-center justify-between px-2"
                    >
                        <p className="text-lg font-medium">{layer.name}</p>
                        <button
                            onClick={() => handleHarvestLayer(layer.id_)}
                            className="px-4 py-2 border border-green-500 text-green-600 rounded-full text-sm font-semibold hover:bg-green-100"
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
