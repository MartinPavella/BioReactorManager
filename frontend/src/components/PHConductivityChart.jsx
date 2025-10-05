import React, {useEffect, useState} from "react";
import {Line} from "react-chartjs-2";
import {
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    TimeScale,
    Title,
    Tooltip,
} from "chart.js";
import "chartjs-adapter-date-fns";

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend, TimeScale);

const backend_uri = "http://bioreactor.local:8000";

const PHCondChart = ({ph, ec}) => {
    const [chartData, setChartData] = useState(null);

    useEffect(() => {
        fetch(`${backend_uri}/get-ph-conductivity-data`)
            .then((res) => res.json())
            .then((values) => {
                if (!values || values.length === 0) return;

                const labels = values.map((v) => new Date(v.timestamp));

                setChartData({
                    labels,
                    datasets: [
                        {
                            label: "pH",
                            data: values.map((v) => v.ph),
                            borderColor: "hsl(200, 80%, 50%)",
                            yAxisID: "y1",
                            tension: 0.2,
                        },
                        {
                            label: "Conductivity [mS/cm]",
                            data: values.map((v) => v.conductivity),
                            borderColor: "hsl(100, 60%, 40%)",
                            yAxisID: "y2",
                            tension: 0.2,
                        },
                    ],
                });
            })
            .catch((err) => console.error("Error fetching pH+Cond data:", err));
    }, []);

    return (
        <div className="w-full mb-6">
            <h2 className="text-center mb-2 text-lg font-semibold">
                Medium pH and Conductivity
                <div className="mt-2 text-center text-sm text-gray-600">
                    {ph === 0 ? "pH probe not connected" : `Current pH: ${ph.toFixed(1)}`} |{" "}
                    {ec === 0 ? "EC probe not connected" : `Current EC: ${ec.toFixed(2)} mS/cm`}
                </div>
            </h2>
            <div style={{height: "300px"}}>
                {chartData ? (
                    <Line
                        data={chartData}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                x: {
                                    type: "time",
                                    time: {
                                        unit: "hour",
                                        tooltipFormat: "PPpp",
                                    },
                                    title: {
                                        display: true,
                                        text: "Time",
                                    },
                                },
                                y1: {
                                    type: "linear",
                                    position: "left",
                                    title: {
                                        display: true,
                                        text: "pH",
                                    },
                                    min: 1,
                                    max: 14,
                                },
                                y2: {
                                    type: "linear",
                                    position: "right",
                                    title: {
                                        display: true,
                                        text: "Conductivity [mS/cm]",
                                    },
                                    grid: {
                                        drawOnChartArea: false,
                                    },
                                },
                            },
                            plugins: {
                                legend: {
                                    position: "top",
                                },
                            },
                        }}
                    />
                ) : (
                    <p className="text-center">Loading pH & conductivity data...</p>
                )}
            </div>
        </div>
    );
};

export default PHCondChart;
