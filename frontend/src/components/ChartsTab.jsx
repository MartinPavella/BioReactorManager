import {useEffect, useState} from "react";
import BioMassChart from "./BioMassChart.jsx";
import PHCondChart from "./PHConductivityChart.jsx";

function ChartsTab() {
    const [biomassValues, setBiomassValues] = useState([0, 0, 0, 0, 0]);
    const [ecValue, setEcValue] = useState(0);
    const [phValue, setPhValue] = useState(0);

    const backend_uri = "http://bioreactor.local:8000";

    // Read the current PROBE data from the ESP, and store it in the backend.
    useEffect(() => {
        const fetchBiomassValues = () => {
            fetch(backend_uri + "/request-current-probe-measurements")
                .catch((err) => console.error("Error requesting probe readings:", err));
        };

        fetchBiomassValues(); // run immediately
        const interval = setInterval(fetchBiomassValues, 1900);

        return () => clearInterval(interval);
    }, [backend_uri]);

    // Read the current pH and EC data from the ESP, and store it in the backend.
    useEffect(() => {
        const fetchPHECValues = () => {
            fetch(backend_uri + "/request-current-ph-ec-measurements")
                .catch((err) => console.error("Error requesting pH and EC readings:", err));
        };

        fetchPHECValues(); // run immediately
        const interval = setInterval(fetchPHECValues, 1900);

        return () => clearInterval(interval);
    }, [backend_uri]);

    // Read the current biomass data from the backend.
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

    // Read the current EC and pH data from the backend.
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

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
            <PHCondChart ec={ecValue} ph={phValue}/>

            {[0, 1, 2, 3, 4].map((layerId) => {
                const reading = biomassValues[layerId];
                const label =
                    reading === 0
                        ? `Layer ${5 - layerId} – PROBE not connected`
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
