import React, { useState } from 'react';
import api from '../../services/api';
import { Button, Input } from '../ui/Components';

const LocationManager = ({ initialLat, initialLng, initialRadius, onUpdate }) => {
  const [lat, setLat] = useState(initialLat || '');
  const [lng, setLng] = useState(initialLng || '');
  const [radius, setRadius] = useState(initialRadius || 10);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  const handleGetLocation = () => {
    setError(null);
    setIsLocating(true);
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setIsLocating(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
        setIsLocating(false);
      },
      () => {
        setError('Unable to retrieve your location');
        setIsLocating(false);
      }
    );
  };

  const handleSave = async () => {
    setMessage(null);
    setError(null);
    setLoading(true);
    
    try {
      const res = await api.put('/providers/location', {
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        serviceRadius: parseInt(radius, 10)
      });
      setMessage('Location updated successfully!');
      if (onUpdate) onUpdate(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update location');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface-dim p-4 rounded-lg border border-border-subtle mt-6">
      <h3 className="font-bold text-neutral-dark mb-4">Manage Service Location</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-neutral-dark mb-1">Latitude</label>
          <Input 
            type="number" 
            step="any"
            value={lat} 
            onChange={(e) => setLat(e.target.value)} 
            placeholder="e.g. 18.5204"
            className="!mb-0"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-dark mb-1">Longitude</label>
          <Input 
            type="number" 
            step="any"
            value={lng} 
            onChange={(e) => setLng(e.target.value)} 
            placeholder="e.g. 73.8567"
            className="!mb-0"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-dark mb-1">Service Radius (km)</label>
          <Input 
            type="number" 
            min="1" 
            max="100"
            value={radius} 
            onChange={(e) => setRadius(e.target.value)} 
            className="!mb-0"
          />
        </div>
      </div>
      
      <div className="flex gap-4 items-center">
        <Button onClick={handleSave} disabled={loading || !lat || !lng}>
          {loading ? 'Saving...' : 'Save Location'}
        </Button>
        <Button onClick={handleGetLocation} variant="secondary" disabled={isLocating}>
          {isLocating ? 'Locating...' : '📍 Use Current Location'}
        </Button>
      </div>
      
      {message && <p className="text-status-success text-sm mt-3">{message}</p>}
      {error && <p className="text-status-error text-sm mt-3">{error}</p>}
    </div>
  );
};

export default LocationManager;
