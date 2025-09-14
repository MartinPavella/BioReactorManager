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
import "chartjs-adapter-date-fns"; // allows time formatting with date-fns

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend, TimeScale);

const backend_uri = "http://bioreactor.local:8000";

const BioMassChart = ({layerId, label}) => {
    const [chartData, setChartData] = useState(null);

    useEffect(() => {
        fetch(`${backend_uri}/get-probe-data/${layerId}`)
            .then((res) => res.json())
            .then((values) => {
                const dataset = values.map((d) => ({
                    x: new Date(d.timestamp),
                    y: d.value,
                }));

                setChartData({
                    datasets: [
                        {
                            label: "Biomass [g]",
                            data: dataset,
                            borderColor: "hsl(142, 87%, 32%)",
                            backgroundColor: "hsl(142, 87%, 60%)",
                            tension: 0.3,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                        },
                    ],
                });
            })
            .catch((err) => console.error(`Error fetching chart data for layer ${layerId}:`, err));
    }, [layerId]);

    return (
        <div className="w-full mb-6">
            <h2 className="text-center mb-2 text-lg font-semibold">{label}</h2>
            <div style={{height: "250px"}}>
                {chartData ? (
                    <Line
                        data={chartData}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    display: true,
                                    position: "top",
                                },
                                tooltip: {
                                    callbacks: {
                                        label: (ctx) => ` ${ctx.parsed.y} g`,
                                    },
                                },
                            },
                            scales: {
                                x: {
                                    type: "time",
                                    time: {
                                        unit: "minute",
                                        displayFormats: {
                                            minute: "HH:mm",
                                            hour: "HH:mm",
                                        },
                                    },
                                    title: {
                                        display: true,
                                        text: "Time",
                                    },
                                    grid: {
                                        color: "rgba(0,0,0,0.05)",
                                    },
                                },
                                y: {
                                    beginAtZero: true,
                                    title: {
                                        display: true,
                                        text: "Biomass [g]",
                                    },
                                    grid: {
                                        color: "rgba(0,0,0,0.05)",
                                    },
                                },
                            },
                        }}
                    />
                ) : (
                    <p className="text-center">Loading data for layer {layerId}...</p>
                )}
            </div>
        </div>
    );
};

export default BioMassChart;
