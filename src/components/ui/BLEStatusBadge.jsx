/**
 * @file BLEStatusBadge.jsx — Light theme BLE connection status indicator
 */
import React from 'react';
import { Bluetooth, BluetoothOff, BluetoothSearching } from 'lucide-react';
import { BLE_STATUS } from '../../hooks/useBLE';

export function BLEStatusBadge({ status, deviceName }) {
  const configs = {
    [BLE_STATUS.CONNECTED]:    { icon: Bluetooth,        label: deviceName || 'Connected', cls: 'text-green-700 bg-green-50 border-green-200' },
    [BLE_STATUS.SCANNING]:     { icon: BluetoothSearching, label: 'Scanning…',             cls: 'text-blue-700 bg-blue-50 border-blue-200' },
    [BLE_STATUS.DISCONNECTED]: { icon: BluetoothOff,     label: 'Disconnected',            cls: 'text-slate-500 bg-slate-100 border-slate-200' },
    [BLE_STATUS.UNSUPPORTED]:  { icon: BluetoothOff,     label: 'BLE Unsupported',         cls: 'text-red-700 bg-red-50 border-red-200' },
    [BLE_STATUS.ERROR]:        { icon: BluetoothOff,     label: 'Connection Error',        cls: 'text-red-700 bg-red-50 border-red-200' },
  };

  const { icon: Icon, label, cls } = configs[status] ?? configs[BLE_STATUS.DISCONNECTED];

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${cls}`}>
      <Icon size={12} />
      <span>{label}</span>
    </div>
  );
}
