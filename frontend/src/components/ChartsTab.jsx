import {useEffect, useState} from "react";
import BioMassChart from "./BioMassChart.jsx";
import PHCondChart from "./PHConductivityChart.jsx";

function ChartsTab() {
    const [biomassValues, setBiomassValues] = useState([0, 0, 0, 0, 0]);
    const [ecValue, setEcValue] = useState(0);
    const [phValue, setPhValue] = useState(0);

    // Keys to force chart reload
    const [phEcReloadKey, setPhEcReloadKey] = useState(0);
    const [biomassReloadKey, setBiomassReloadKey] = useState(0);

    const backend_uri = "http://bioreactor.local:8000";

    // Request biomass from ESP every ~2s
    useEffect(() => {
        const fetchBiomassValues = () => {
            fetch(backend_uri + "/request-current-probe-measurements")
                .catch((err) => console.error("Error requesting probe readings:", err));
        };

        fetchBiomassValues();
        const interval = setInterval(fetchBiomassValues, 1900);
        return () => clearInterval(interval);
    }, [backend_uri]);

    // Request pH+EC from ESP every ~2s
    useEffect(() => {
        const fetchPHECValues = () => {
            fetch(backend_uri + "/request-current-ph-ec-measurements")
                .catch((err) => console.error("Error requesting pH and EC readings:", err));
        };

        fetchPHECValues();
        const interval = setInterval(fetchPHECValues, 1900);
        return () => clearInterval(interval);
    }, [backend_uri]);

    // Read biomass values stored in backend
    useEffect(() => {
        const fetchReadings = () => {
            fetch(`${backend_uri}/get-current-biomass-values`)
                .then((res) => {
                    if (!res.ok) {
                        throw new Error(`HTTP error! status: ${res.status}`);
                    }
                    return res.json();
                })
                .then((data) => {
                    if (data && Array.isArray(data.biomass)) {
                        setBiomassValues(data.biomass);
                    }
                })
                .catch((err) => {
                    console.error("Error fetching biomass values:", err);
                });
        };

        fetchReadings();
        const interval = setInterval(fetchReadings, 2000);
        return () => clearInterval(interval);
    }, [backend_uri]);

    // Read pH + EC values stored in backend
    useEffect(() => {
        const fetchPH_EC = () => {
            Promise.all([
                fetch(`${backend_uri}/get-current-ec-value`)
                    .then(res => res.json())
                    .then(data => data.value)
                    .catch(err => {
                        console.error("Error fetching EC:", err);
                        return 0;
                    }),
                fetch(`${backend_uri}/get-current-ph-value`)
                    .then(res => res.json())
                    .then(data => data.value)
                    .catch(err => {
                        console.error("Error fetching pH:", err);
                        return 0;
                    })
            ])
                .then(([ec, ph]) => {
                    setEcValue(ec);
                    setPhValue(ph);
                });
        };

        fetchPH_EC();
        const interval = setInterval(fetchPH_EC, 2000);
        return () => clearInterval(interval);
    }, [backend_uri]);

    // --- Handlers for deleting data ---
    const handleDeletePhEc = () => {
        if (!window.confirm("Are you sure you want to delete all pH/EC data?")) return;

        fetch(`${backend_uri}/delete-ph-ec-readings`, {method: "DELETE"})
            .then((res) => {
                if (!res.ok) throw new Error("Failed to delete pH/EC data");
                return res.json();
            })
            .then(() => {
                // Force PHCondChart to reload by updating key
                setPhEcReloadKey((prev) => prev + 1);
            })
            .catch((err) => {
                console.error("Error deleting pH/EC data:", err);
                alert("Error deleting pH/EC data.");
            });
    };

    const handleDeleteProbes = () => {
        if (!window.confirm("Are you sure you want to delete all PROBE data?")) return;

        fetch(`${backend_uri}/delete-probe-readings`, {method: "DELETE"})
            .then((res) => {
                if (!res.ok) throw new Error("Failed to delete PROBE data");
                return res.json();
            })
            .then(() => {
                // Force BioMassCharts to reload by updating key
                setBiomassReloadKey((prev) => prev + 1);
            })
            .catch((err) => {
                console.error("Error deleting PROBE data:", err);
                alert("Error deleting PROBE data.");
            });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
            {/* pH + EC chart */}
            <div className="flex flex-col">
                <PHCondChart key={phEcReloadKey} ec={ecValue} ph={phValue}/>
                <button
                    onClick={handleDeletePhEc}
                    className="mt-4 py-2 px-4 bg-white border-2 border-red-600 text-red-600 rounded-lg shadow hover:bg-red-50 font-semibold"
                >
                    🗑 Delete pH & EC Data
                </button>
            </div>

            {/* Biomass charts */}
            <div className="col-span-1 md:col-span-2 space-y-6">
                {[0, 1, 2, 3, 4].map((layerId) => {
                    const reading = biomassValues[layerId];
                    const label =
                        reading === 0
                            ? `Layer ${5 - layerId} – PROBE not connected`
                            : `Layer ${5 - layerId} – Current biomass = ${reading} g`;

                    return (
                        <BioMassChart
                            key={`${biomassReloadKey}-${layerId}`}
                            layerId={layerId}
                            label={label}
                        />
                    );
                })}

                <button
                    onClick={handleDeleteProbes}
                    className="mt-6 w-full py-3 bg-white border-2 border-red-600 text-red-600 text-lg rounded-lg shadow hover:bg-red-50 font-semibold"
                >
                    🗑 Delete PROBE Data
                </button>
            </div>
        </div>
    );
}

export default ChartsTab;
