import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../stores/globalStore";
import {
  Button,
  Modal,
  Card,
  Text,
  Group,
  Badge,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { useHistory } from "react-router-dom";
import { clearGlobalDevice } from "../../stores/deviceSlice";
import DeviceImage from "./DeviceImage";
import { deviceImageUrls } from "../../utils/deviceImages";
import DeviceIcon from "./DeviceIcon";



export const CurrentDevice = () => {
  const { t } = useTranslation();
  const { globalDevice } = useSelector((state: RootState) => state.device);
  const dispatch = useDispatch();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const history = useHistory();

  function openModal() {
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
  }

  function handleConfirm() {
    dispatch(clearGlobalDevice());
    setIsModalOpen(false);
  }

  const imageUrls = deviceImageUrls(globalDevice);
  // Its model's page, on the variant when one is known; a device typed in by
  // hand has no page.
  const sheetHref = globalDevice?.model_id
    ? `/app/model/${globalDevice.model_id}${globalDevice.device_id ? `?variant=${globalDevice.device_id}` : ""}`
    : globalDevice?.device_id
      ? `/app/device/${globalDevice.device_id}`
      : null;

  return (
    <>
      {globalDevice ? (
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Group gap={6} mb="xs">
            <span className="material-symbols-outlined text-customgreen-600 dark:text-customgreen-400 text-base">
              devices
            </span>
            <Text size="xs" tt="uppercase" fw={700} c="dimmed">
              {t('devicesComponent.currentDeviceLabel')}
            </Text>
          </Group>

          <Card.Section>
            <div className="flex justify-center items-center h-28 bg-gray-100 dark:bg-gray-800 p-4">
              <DeviceImage
                urls={imageUrls}
                alt={globalDevice.model}
                className="object-contain h-full w-full mix-blend-multiply dark:mix-blend-normal"
                fallback={<DeviceIcon deviceType={globalDevice.device_type} className="text-6xl text-gray-400 dark:text-gray-500" />}
              />
            </div>
          </Card.Section>

          <Text size="lg" mt={"xs"} fw={700} lineClamp={1}>{globalDevice.model}</Text>
          <Text size="sm" mb={"xs"} color="dimmed">{globalDevice.brand}</Text>

          {((globalDevice.categories && globalDevice.categories.length) || globalDevice.device_type) && (
            <Badge
              variant="light"
              color="gray"
              style={{ textTransform: 'none' }}
              styles={{
                root: { height: 'auto', display: 'inline-flex', paddingTop: 4, paddingBottom: 4 },
                label: { whiteSpace: 'normal', overflow: 'visible', textOverflow: 'unset' },
              }}
            >
              {(globalDevice.categories && globalDevice.categories.length) ? globalDevice.categories.map(c => c.name).join(', ') : ''}
              {globalDevice.device_type ? ` · ${globalDevice.device_type}` : ''}
            </Badge>
          )}

          <Group grow gap={8} mt="md">
            {sheetHref && (
              <Tooltip label={t('devicesComponent.viewFullSheet')} withArrow>
                <ActionIcon
                  component="a"
                  href={sheetHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outline"
                  color="customgreen"
                  radius="md"
                  size="lg"
                  aria-label={t('devicesComponent.viewFullSheet')}
                >
                  <span className="material-symbols-outlined text-base">open_in_new</span>
                </ActionIcon>
              </Tooltip>
            )}

            <Tooltip label={t('devicesComponent.changeDevice')} withArrow>
              <ActionIcon
                variant="light"
                color="blue"
                radius="md"
                size="lg"
                onClick={() => history.push('/app/devices')}
                aria-label={t('devicesComponent.changeDevice')}
              >
                <span className="material-symbols-outlined text-base">sync_alt</span>
              </ActionIcon>
            </Tooltip>

            <Tooltip label={t('devicesComponent.remove')} withArrow>
              <ActionIcon
                variant="subtle"
                color="red"
                radius="md"
                size="lg"
                onClick={openModal}
                aria-label={t('devicesComponent.remove')}
              >
                <span className="material-symbols-outlined text-base">delete</span>
              </ActionIcon>
            </Tooltip>
          </Group>

          <Modal opened={isModalOpen} onClose={closeModal} title={t('devicesComponent.removeDevice')}>
            <Text>{t('devicesComponent.removeDeviceConfirm')}</Text>
            <Group  mt="md">
              <Button variant="default" onClick={closeModal}>
                {t('devicesComponent.cancel')}
              </Button>
              <Button color="red" onClick={handleConfirm}>
                {t('devicesComponent.remove')}
              </Button>
            </Group>
          </Modal>
        </Card>
      ) : (
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <div className="flex flex-col items-center text-center">
            <span className="material-symbols-outlined text-6xl text-gray-400 dark:text-gray-500 mb-4">
              device_unknown
            </span>
            <Text size="lg" fw={500} mb="sm">
              {t('devicesComponent.noDeviceSelected')}
            </Text>
            <Text size="sm" color="dimmed" mb="md">
              {t('devicesComponent.noDeviceSelectedDesc')}
            </Text>
            <Button onClick={() => history.push('/app/devices')} variant="light" color="blue" >
              {t('devicesComponent.selectDevice')}
            </Button>
          </div>
        </Card>
      )}
    </>
  );
};
