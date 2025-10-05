import {useState} from "react";

function HarvestTab() {
    const [loading, setLoading] = useState(false);
    const backend_uri = "http://bioreactor.local:8000";

    const handleHarvestLayer = (layerId) => {
        if (loading) return;
        setLoading(true);
        fetch(`${backend_uri}/harvest-layer/${layerId}`, {method: "POST"})
            .then((res) => res.json())
            .catch((err) => console.error(`Error harvesting layer ${layerId}:`, err))
            .finally(() => setLoading(false));
    };

    const handleFailSafe = () => {
        if (loading) return;
        setLoading(true);
        fetch(`${backend_uri}/turn-everything-off`, {method: "POST"})
            .then((res) => res.json())
            .catch((err) => console.error("Error turning everything off:", err))
            .finally(() => setLoading(false));
    };

    return (
        <div className="w-full max-w-md space-y-6">
            {[0, 1, 2, 3, 4].map((layerId) => (
                <button
                    key={layerId}
                    onClick={() => handleHarvestLayer(layerId)}
                    disabled={loading}
                    className="w-full py-6 border-2 border-green-600 text-green-700 text-2xl font-bold rounded-lg hover:bg-green-100 shadow"
                >
                    🌱 Harvest Layer {5 - layerId}
                </button>
            ))}

            <button
                onClick={handleFailSafe}
                disabled={loading}
                className="w-full py-6 border-2 border-red-600 text-red-700 text-2xl font-bold rounded-lg hover:bg-red-100 shadow"
            >
                🚨 Turn everything OFF
            </button>
        </div>
    );
}

export default HarvestTab;
