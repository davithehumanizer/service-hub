import { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageTitle from '../components/Typography/PageTitle';
import { Button, Badge, Text } from "@mantine/core";
import { deviceService } from '../services/deviceService';
import { Device } from '../models/device';
import DeviceIcon from '../components/Devices/DeviceIcon';
import DeviceImage from '../components/Devices/DeviceImage';
import DeviceDetailTabs from '../components/Devices/DeviceDetailTabs';
import { deviceImageUrls } from '../utils/deviceImages';
import { tutorialsPath } from '../utils/tutorialsPath';
import { useHasTutorials } from '../hooks/useHasTutorials';

const DeviceDetails = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [device, setDevice] = useState<Device | null>(null);
  const history = useHistory();

  const hasTutorials = useHasTutorials(device);

  // An entry is a variant of a model: its page is the model's, opened on it
  // (decision 11). An entry not given a model yet keeps this page.
  useEffect(() => {
    if (id) {
      deviceService.getById(id).then((found: Device) => {
        if (found.model_id) {
          history.replace(`/app/model/${found.model_id}?variant=${found.device_id}`);
          return;
        }
        setDevice(found);
      });
    }
  }, [id]);

  if (!device) {
    return <div>{t('common.loading')}</div>;
  }

  return (
    <>
      <PageTitle>{t('deviceDetails.title')}</PageTitle>
      <div className="mb-6 animate-in slide-in-from-top-4 duration-500">
        <Button 
            variant="subtle" 
            color="gray" 
            size="sm"
            onClick={() => history.push('/app/devices')} 
            leftSection={<span className="material-symbols-outlined text-sm">arrow_back</span>}
            className="mb-4 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
             {t('deviceDetails.backToList')}
        </Button>
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700">
           {/* Background Pattern */}
           <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none hidden sm:block" style={{ transform: 'scale(3)' }}>
              <DeviceIcon deviceType={device.device_type} className="text-9xl" />
           </div>

           <div className="flex flex-col md:flex-row p-4 sm:p-8 gap-6 sm:gap-8 relative z-10">
              {/* Image Section */}
              <div className="flex-shrink-0 flex justify-center items-center bg-white dark:bg-gray-900 dark:bg-opacity-50 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-inner w-full md:w-64 h-64">
                   <DeviceImage
                      urls={deviceImageUrls(device)}
                      alt={device.model}
                      className="object-contain w-full h-full transform hover:scale-105 transition-transform duration-300"
                      fallback={<DeviceIcon deviceType={device.device_type} className="text-8xl text-gray-300 dark:text-gray-600" />}
                   />
              </div>

              {/* Info Section */}
              <div className="flex-1 flex flex-col justify-center space-y-4">
                 <div className="flex items-center gap-3">
                    <Badge size="lg" radius="sm" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
                        {device.brand}
                    </Badge>
                     <Badge size="lg" radius="sm" variant="outline" color="gray">
                        {(device.categories && device.categories.length > 0) ? device.categories.map(c => c.name).join(', ') : t('common.unknown')}
                    </Badge>
                 </div>
                 
                 <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight">
                        {device.model}
                    </h1>
                    {device.product_code && (
                        <Text c="dimmed" size="sm" mt={1} className="font-mono">
                            {device.product_code}
                        </Text>
                    )}
                    {device.serial_number && (
                        <Text c="dimmed" size="sm" mt={1} className="font-mono">
                            {t('deviceDetails.serialNumber')}: {device.serial_number}
                        </Text>
                    )}
                 </div>

                 <div className="flex gap-3 pt-2">
                    <Button
                      variant="light"
                      color="orange"
                      loading={hasTutorials === null}
                      disabled={hasTutorials === false}
                      leftSection={<span className="material-symbols-outlined text-sm">build</span>}
                      onClick={() => history.push(tutorialsPath(device))}
                    >
                      {t('devicesComponent.viewTutorials')}
                    </Button>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <div className="px-4 py-3 mb-4 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <div className="hidden"> {/* Old header hidden but preserved structure if needed for referencing */}
           <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <DeviceIcon deviceType={device.device_type} className="mr-4 text-4xl text-blue-600 dark:text-blue-400" />
                <h1 className="text-2xl font-bold">{device.model}</h1>
              </div>
                <Button className='mt-5 bg-blue-500 hover:bg-blue-600' size="compact-md" onClick={() => history.push('/app/devices')} color='blue'>
                Back
                </Button>
            </div>
        </div>

        <DeviceDetailTabs device={device} />
      </div>
    </>
  );
};

export default DeviceDetails;