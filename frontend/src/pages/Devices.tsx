import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DeviceSearch from "../components/Wizard/Steps/DeviceSearch";
import UserDevices from '../components/Devices/UserDevices'; // Import the new component
import { Tabs } from '@mantine/core'; // Import Tabs from Mantine
import { MagnifyingGlassIcon, ListBulletIcon } from '@heroicons/react/24/outline'; // Import icons
import { Button } from '@mantine/core';
import { useHistory, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../stores/globalStore';

const Devices = () => {
    const { t } = useTranslation();
    const guest = useSelector((state: RootState) => state.auth.guest);
    const history = useHistory();
    const location = useLocation();
    // ?tab=mine: where the end of the wizard and "My repairs" lead.
    const [activeTab, setActiveTab] = useState<string>(
        !guest && new URLSearchParams(location.search).get('tab') === 'mine' ? 'my-devices' : 'search',
    );
    const _segments = location.pathname.split('/').filter(Boolean);
    const base = _segments.length ? `/${_segments[0]}` : '';
    const initialDeviceSearch = new URLSearchParams(location.search).get('q') ?? undefined;
    // From the home page, where nothing was found: already the wider search.
    const initialExtended = new URLSearchParams(location.search).get('extended') === '1';

    // Strip ?q from URL after consuming it so a refresh uses Redux state, not the stale param
    useEffect(() => {
        if (initialDeviceSearch) {
            history.replace(location.pathname);
        }
    }, []);

    return (
    // Main.tsx already provides the centred container and horizontal padding;
    // adding another one here doubled the padding and threw the page off-centre.
    <div className="w-full py-10">
        <div className="w-full space-y-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center">
                            <span className="material-symbols-outlined text-3xl text-blue-600 dark:text-blue-400 mr-3">devices</span>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {t('devices.title')}
                                </h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {t('devices.subtitle')}
                                </p>
                            </div>
                        </div>
                                            {!guest && (
                                                <div>
                                                    <Button color="blue" onClick={() => history.push(`${base}/create-device`)}>{t('devices.addDevice')}</Button>
                                                </div>
                                            )}
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <Tabs color="blue"  value={activeTab} onChange={(value) => setActiveTab(value ?? 'search')}>
                    <Tabs.List style={{ flexWrap: 'wrap' }}>
                        <Tabs.Tab
                            value="search"
                            leftSection={<MagnifyingGlassIcon className="w-4 h-4" />}
                        >
                            {t('devices.searchTab')}
                        </Tabs.Tab>
                        {!guest && (
                            <Tabs.Tab
                                value="my-devices"
                                leftSection={<ListBulletIcon className="w-4 h-4" />}
                            >
                                {t('devices.myDevicesTab')}
                            </Tabs.Tab>
                        )}
                    </Tabs.List>

                    <Tabs.Panel value="search" pt="xs">
                        {/* Pass showDeviceDetailButton={true} to enable the details button */}
                        <DeviceSearch showDeviceDetailButton={true} color="blue" initialSearch={initialDeviceSearch} initialExtended={initialExtended} />
                    </Tabs.Panel>

                    {/* Mounted with the others, whatever the tab: a guest's would ask for devices it has none of. */}
                    {!guest && (
                        <Tabs.Panel value="my-devices" pt="xs">
                            <UserDevices onFindDevice={() => setActiveTab('search')} />
                        </Tabs.Panel>
                    )}
                </Tabs>
            </div>
            </div>
        </div>
    );
}

export default Devices;