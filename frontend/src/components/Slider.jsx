import { useState } from 'react';

export default function Slider() {
  const [value, setValue] = useState(50);

  const handleChange = (e) => {
    setValue(Number(e.target.value));
  };

  const containerStyle = {
    maxWidth: '400px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    fontFamily: 'Arial, sans-serif'
  };

  const titleStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '20px',
    textAlign: 'center',
    color: '#333'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#555',
    marginBottom: '10px'
  };

  const sliderStyle = {
    width: '100%',
    height: '8px',
    backgroundColor: '#ddd',
    borderRadius: '4px',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none'
  };

  const markersStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#666',
    marginTop: '5px'
  };

  const resultStyle = {
    marginTop: '15px',
    padding: '10px',
    backgroundColor: '#e3f2fd',
    borderRadius: '4px',
    fontSize: '14px',
    color: '#1976d2'
  };

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>Pump power</h2>
      
      <div>
        <label htmlFor="slider" style={labelStyle}>
          Value: {value}
        </label>
        <input
          id="slider"
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={handleChange}
          style={sliderStyle}
        />
      </div>
      
      <div style={markersStyle}>
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
      
      <div style={resultStyle}>
        Current value: <strong>{value}</strong>
      </div>
      
      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #2196f3;  
          cursor: pointer;
        }
        
        input[type="range"]::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #2196f3;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}