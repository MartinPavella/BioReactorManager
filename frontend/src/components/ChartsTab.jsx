import {useEffect, useState} from "react";
import BioMassChart from "./BioMassChart.jsx";
import PHCondChart from "./PHConductivityChart.jsx";

function ChartsTab() {
    const [probeReadings, setProbeReadings] = useState([0, 0, 0, 0, 0]);
    const backend_uri = "http://bioreactor.local:8000";

    // Read the current PROBE data from the ESP, and store it in the backend.
    useEffect(() => {
        const fetchProbeReadings = () => {
            fetch(backend_uri + "/request-current-probe-measurements")
                .catch((err) => console.error("Error requesting probe readings:", err));
        };

        fetchProbeReadings(); // run immediately
        const interval = setInterval(fetchProbeReadings, 900);

        return () => clearInterval(interval);
    }, [backend_uri]);

    // Read the current PROBE data from the backend.
    useEffect(() => {
        const fetchReadings = () => {
            Promise.all(
                [0, 1, 2, 3, 4].map((id) =>
                    fetch(`${backend_uri}/get-current-probe-reading/${id}`)
                        .then((res) => {
                            if (!res.ok) {
                                throw new Error(`HTTP error! status: ${res.status}`);
                            }
                            return res.json();
                        })
                        .then((data) => data.value)
                        .catch((err) => {
                            console.error(`Error fetching probe ${id}:`, err);
                            return 0; // fallback
                        })
                )
            )
                .then((data) => setProbeReadings(data))
                .catch((err) =>
                    console.error("Error updating probe readings:", err)
                );
        };

        fetchReadings();
        const interval = setInterval(fetchReadings, 1000); // poll every second
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
            <PHCondChart/>

            {[0, 1, 2, 3, 4].map((layerId) => {
                const reading = probeReadings[layerId];
                const label =
                    reading === 0
                        ? `Layer ${5 - layerId} – Probe not connected`
                        : `Layer ${5 - layerId} – Current biomass = ${reading} g`;

                return (
                    <BioMassChart
                        key={layerId}
                        layerId={layerId}
                        label={label}
                    />
                );
            })}
        </div>
    );
}

export default ChartsTab;
