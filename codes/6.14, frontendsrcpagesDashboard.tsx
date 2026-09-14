import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getRings, getAvailableStaff } from '../api';
import MapView from '../components/MapView';
import TableView from '../components/TableView';
import { AvailableStaff } from '../types';
import { useSocket } from '../hooks/useSocket';
import { ToastContainer, toast } from 'react-toastify';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [rings, setRings] = useState<any[]>([]);
  const [staff, setStaff] = useState<AvailableStaff[]>([]);
  const [center] = useState<[number, number]>([48.5, 9.0]); // approximate center of BW

  const socket = useSocket(localStorage.getItem('token') || undefined);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const ringsRes = await getRings();
        setRings(ringsRes.data.features || []);
        const staffRes = await getAvailableStaff();
        setStaff(staffRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('newAvailability', (data) => {
      toast.info(`${data.abbreviation} (${data.ringName}) ist ab ${data.start_date} verfügbar`);
      // Refresh staff list
      getAvailableStaff().then(res => setStaff(res.data));
    });
    return () => {
      socket.off('newAvailability');
    };
  }, [socket]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Verfügbare Helfer</h1>
      <div className="mb-4">
        <MapView rings={rings} staff={staff} center={center} />
      </div>
      <div>
        <TableView data={staff} userRingId={user?.ringId || 0} />
      </div>
      <ToastContainer position="top-right" autoClose={5000} />
    </div>
  );
};

export default Dashboard;