import React, { useEffect, useState } from 'react';
import { useParams, useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { deviceService } from "../services/deviceService";
import { deviceModelService } from "../services/deviceModelService";
import { DeviceModel } from "../models/deviceModel";
import { useSelector } from 'react-redux';
import { RootState } from '../stores/globalStore';
import { Link } from 'react-router-dom';
import { Button, Loader, Alert } from '@mantine/core';
import DifficultyRating from '../components/DifficultyRating';
import IfixitSearchAutocomplete from '../components/IfixitSearchAutocomplete';
import {
  YOUTUBE_TERM,
  componentsLabel,
  isAboutComponents,
  parseTutorialComponents,
} from '../utils/tutorialComponents';
import { searchCategory } from '../utils/tutorialsPath';

interface IfixitTutorial {
  guideid: number;
  title: string;
  image: {
    standard: string;
  };
  url: string;
  type: string;
  subject: string;
  difficulty: string;
}

interface YoutubeVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  url: string;
}

type MatchQuality =
  | 'exact'
  | 'related'
  | 'device-without-guides'
  | 'none'
  | null;

type ResolvedDevice = {
  title: string;
  display_title?: string;
  url?: string;
} | null;

/** Below this many exact guides, YouTube is worth its quota anyway. */
const THIN_GUIDE_COUNT = 3;

const IfixitTutorials = () => {
  const { t, i18n } = useTranslation();
  const { deviceName } = useParams<{ deviceName: string }>();
  const [tutorials, setTutorials] = useState<IfixitTutorial[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const history = useHistory();
  const location = useLocation();
  const device = useSelector((state: RootState) => state.device.globalDevice);

  // React Router leaves `key` undefined on the entry the app was loaded with,
  // which is how we tell a real in-app visit from a deep link.
  const cameFromInsideApp = Boolean(location.key);

  const [type, setType] = useState('');
  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState('');

  const [types, setTypes] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [difficulties, setDifficulties] = useState<string[]>([]);

  const [videos, setVideos] = useState<YoutubeVideo[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);

  // How the backend found these guides:
  //   exact                  guides attached to this very device
  //   related                guides for a neighbouring device
  //   device-without-guides  device recognised, nobody wrote a guide for it
  //   none                   device not recognised at all
  const [matchQuality, setMatchQuality] = useState<MatchQuality>(null);
  const [resolvedDevice, setResolvedDevice] = useState<ResolvedDevice>(null);

  // Brand and category refine the search (see ifixit-adapter.service.ts:
  // brand+model -> model -> brand+category -> category). They come from the
  // global device when the wizard set one, and otherwise from the query string
  // — the device page has no global device to offer and carries them in the
  // URL instead.
  const matchingDevice = device?.model === deviceName ? device : null;
  const search = new URLSearchParams(location.search);

  // Typed in the search box, a reference arrives alone: "KGN76CXE0N" found
  // nothing, where the wizard, which knows it is a Bosch fridge, finds guides.
  // Our own catalogue tells the brand and the category.
  const needsLookup =
    Boolean(deviceName) && !matchingDevice && !search.get('brand') && !search.get('category');
  // Keyed by the name looked up, so a new search never runs with the brand
  // found for the previous one.
  const [lookup, setLookup] = useState<{ name: string; model: DeviceModel | null } | null>(null);
  useEffect(() => {
    if (!needsLookup) return;
    const controller = new AbortController();
    deviceModelService
      .search({ search: deviceName, limit: 1, strict: true, signal: controller.signal })
      .then((page) => {
        const model = page.data[0];
        // A brand alone names no one device; iFixit answers "Fairphone" with
        // all its Fairphone guides, better than any one model would.
        const brandOnly =
          model && deviceName.trim().toLowerCase() === model.brand.trim().toLowerCase();
        setLookup({ name: deviceName, model: model && !brandOnly ? model : null });
      })
      .catch(() => {
        if (!controller.signal.aborted) setLookup({ name: deviceName, model: null });
      });
    return () => controller.abort();
  }, [deviceName, needsLookup]);
  const catalogueChecked = !needsLookup || lookup?.name === deviceName;
  const catalogueModel = lookup && lookup.name === deviceName ? lookup.model : null;

  const brand =
    matchingDevice?.brand ?? search.get('brand') ?? catalogueModel?.brand ?? undefined;
  const category =
    searchCategory(matchingDevice?.categories) ??
    search.get('category') ??
    searchCategory(catalogueModel?.categories) ??
    undefined;
  const categoryWikiId =
    matchingDevice?.categories?.[0]?.ifixit_wikiid ??
    search.get('categoryWikiId') ??
    catalogueModel?.categories?.[0]?.ifixit_wikiid ??
    undefined;
  // The part the wizard diagnosed. Its guides come first; without one, the
  // easiest guide led, and a battery problem was offered a screen guide.
  const componentParam = search.get('component');
  const components = parseTutorialComponents(componentParam);

  useEffect(() => {
    if (!deviceName) {
      if (device) {
        // replace, not push: this is a redirect, and leaving the bare
        // /app/ifixit-tutorials entry in the stack traps Back — returning to it
        // re-runs this effect and pushes forward again (PBI 13770).
        history.replace(`/app/ifixit-tutorials/${device.model}`);
      }
      setLoading(false);
      return;
    }
    // One search, with what the catalogue knows, rather than two in a row.
    if (!catalogueChecked) {
      return;
    }

    const fetchTutorials = async () => {
      try {
        setLoading(true);
        setVideos([]);
        const response = await deviceService.searchIfixit(
          deviceName,
          type,
          subject,
          difficulty,
          brand,
          category,
          categoryWikiId ?? undefined,
        );
        const data = response.data; // Extract the actual data from the API gateway response
        const results = data.results || data;

        // The adapter now reports how it found these guides. `related` means
        // they belong to a neighbouring device, not this one — previously they
        // were displayed as if they were an exact match.
        setMatchQuality(data.matchQuality ?? null);
        setResolvedDevice(data.resolvedDevice ?? null);

        const difficultyOrder: { [key: string]: number } = {
          'easy': 1,
          'very easy': 1,
          'moderate': 2,
          'hard': 3,
          'difficult': 3,
        };

        const sortedResults = results.sort((a: IfixitTutorial, b: IfixitTutorial) => {
          const difficultyA = difficultyOrder[a.difficulty?.toLowerCase()] || 5;
          const difficultyB = difficultyOrder[b.difficulty?.toLowerCase()] || 5;
          return difficultyA - difficultyB;
        });

        setTutorials(sortedResults);

        if (results.length > 0) {
          setTypes([...new Set(results.map((t: IfixitTutorial) => t.type))] as string[]);
          setSubjects([...new Set(results.map((t: IfixitTutorial) => t.subject))] as string[]);
          setDifficulties([...new Set(results.map((t: IfixitTutorial) => t.difficulty))] as string[]);
        }

      } catch (err) {
        setError('Failed to fetch tutorials.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTutorials();
  }, [deviceName, device, history, type, subject, difficulty, brand, category,
      categoryWikiId, catalogueChecked, i18n.language]);

  // YouTube is the only practical source outside IT: iFixit covers computers
  // and phones well, but those are ~5% of what our users actually repair —
  // household appliances and textile dominate, and iFixit has almost nothing
  // there. A thin exact match counts as not covered: the Fairphone 6 wiki
  // holds a single screen guide, while its battery video is on YouTube.
  // Fetch and render read this one flag — as two conditions, the videos were
  // fetched and then hidden.
  const forComponents = components.length
    ? tutorials.filter((tutorial) => isAboutComponents(tutorial, components))
    : [];
  const otherTutorials = components.length
    ? tutorials.filter((tutorial) => !isAboutComponents(tutorial, components))
    : tutorials;
  const wantsVideos =
    matchQuality !== 'exact' ||
    (components.length ? forComponents.length : tutorials.length) < THIN_GUIDE_COUNT;
  const videoQuery = components.length
    ? `${deviceName} ${YOUTUBE_TERM[components[0]]}`
    : deviceName;

  useEffect(() => {
    if (loading || error || !deviceName || !wantsVideos) {
      return;
    }

    let cancelled = false;
    const fetchVideos = async () => {
      try {
        setVideosLoading(true);
        const response = await deviceService.searchYoutubeVideos(videoQuery);
        const data = response.data;
        if (!cancelled) {
          setVideos(data?.results ?? []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setVideosLoading(false);
      }
    };

    fetchVideos();
    return () => { cancelled = true; };
  }, [loading, error, deviceName, wantsVideos, videoQuery]);

  const renderTutorial = (tutorial: IfixitTutorial) => (
      <div key={tutorial.guideid} className="bg-gray-50 dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden transform hover:-translate-y-1 transition-all duration-300 flex flex-col">
          {tutorial.image && (
              <img src={tutorial.image.standard} alt={tutorial.title} className="w-full h-48 object-cover" />
          )}
          <div className="p-6 flex flex-col flex-grow justify-between">
            <div>
              <div className="flex justify-between items-start">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{tutorial.title}</h3>
                  <DifficultyRating difficulty={tutorial.difficulty} />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{tutorial.subject}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{tutorial.type}</p>
            </div>
            <Button
                component="a"
                href={tutorial.url}
                target="_blank"
                rel="noopener noreferrer"
                variant="light"
                color="orange"
                fullWidth
                mt="md"
                rightSection={<span className="material-symbols-outlined">arrow_forward</span>}
            >
                {t('tutorials.viewTutorial')}
            </Button>
          </div>
      </div>
  );

  if (!deviceName && !device) {
    return (
        <>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 mt-4 mb-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                        <span className="material-symbols-outlined text-3xl text-orange-600 dark:text-orange-400 mr-3">menu_book</span>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {t('tutorials.title')}
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {t('tutorials.searchDeviceHint')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Searching from here is the whole point of the Tutorials menu;
                    routing through the device list first was an extra step for
                    nothing (PBI 13716). */}
                <IfixitSearchAutocomplete
                  onSearch={(query) => history.push(`/app/ifixit-tutorials/${encodeURIComponent(query)}`)}
                />

                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    {t('tutorials.selectDevice')}{' '}
                    <Link to="/app/devices" className="text-orange-600 dark:text-orange-400 font-medium hover:underline">
                        {t('tutorials.selectDeviceButton')}
                    </Link>
                </p>
            </div>
        </>
    );
  }

  if (loading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader color="orange" />
        </div>
    );
  }

  if (error) {
    return (
        <Alert color="red" title="Error">
            {error}
        </Alert>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 mt-4 mb-8">
          {/* Back to wherever the user came from — the device sheet or the wizard.
              On a deep link there is nothing to go back to, so offer the device
              list instead of walking the user off the site (PBI 13770). */}
          {cameFromInsideApp ? (
            <button
              type="button"
              onClick={() => history.goBack()}
              className="inline-flex items-center gap-1 mb-4 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              {t('common.back')}
            </button>
          ) : (
            <Link
              to="/app/devices"
              className="inline-flex items-center gap-1 mb-4 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              {t('devices.title')}
            </Link>
          )}

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                  <span className="material-symbols-outlined text-3xl text-orange-600 dark:text-orange-400 mr-3">menu_book</span>
                  <div>
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                          {t('tutorials.tutorialsFor', { device: deviceName })}
                      </h1>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                          {t('tutorials.tutorialsFound', { count: tutorials.length })}
                      </p>
                  </div>
              </div>
          </div>

          <IfixitSearchAutocomplete
            initialValue={deviceName}
            onSearch={(query) => history.push(`/app/ifixit-tutorials/${encodeURIComponent(query)}`)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <select onChange={(e) => setType(e.target.value)} value={type} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500">
                  <option value="">{t('tutorials.allTypes')}</option>
                  {types.map(t_ => <option key={t_} value={t_}>{t_}</option>)}
              </select>
              <select onChange={(e) => setSubject(e.target.value)} value={subject} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500">
                  <option value="">{t('tutorials.allSubjects')}</option>
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select onChange={(e) => setDifficulty(e.target.value)} value={difficulty} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500">
                  <option value="">{t('tutorials.allDifficulties')}</option>
                  {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
          </div>

          {/* What the backend actually matched. Previously all four outcomes
              produced the same page, and guides for a neighbouring device were
              shown as if they belonged to this one. */}
          {/* Dark backgrounds use solid shades: Tailwind v2 has no /opacity
              modifier, so dark:bg-orange-900/30 is never generated and the panel
              would stay light while the text turned light — unreadable. */}
          {matchQuality === 'related' && tutorials.length > 0 && (
            <div className="mb-6 rounded-lg border border-orange-300 bg-orange-50 p-4 dark:border-orange-700 dark:bg-orange-900">
              <div className="flex items-start">
                <span className="material-symbols-outlined mr-2 text-orange-600 dark:text-orange-300">info</span>
                <p className="text-sm text-orange-900 dark:text-orange-100">
                  {t('tutorials.match.related', { device: deviceName })}
                </p>
              </div>
            </div>
          )}

          {matchQuality === 'device-without-guides' && (
            <div className="mb-6 rounded-lg border border-blue-300 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-900">
              <div className="flex items-start">
                <span className="material-symbols-outlined mr-2 text-blue-600 dark:text-blue-300">check_circle</span>
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <p>
                    {t('tutorials.match.deviceWithoutGuides', {
                      device: resolvedDevice?.display_title || resolvedDevice?.title || deviceName,
                    })}
                  </p>
                  {resolvedDevice?.url && (
                    <a
                      href={resolvedDevice.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block underline"
                    >
                      {t('tutorials.match.viewOnIfixit')}
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {matchQuality === 'none' && (
            <div className="mb-6 rounded-lg border border-gray-300 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800">
              <div className="flex items-start">
                <span className="material-symbols-outlined mr-2 text-gray-500 dark:text-gray-300">search_off</span>
                <p className="text-sm text-gray-700 dark:text-gray-200">
                  {t('tutorials.match.none', { device: deviceName })}
                </p>
              </div>
            </div>
          )}

          {components.length > 0 && tutorials.length > 0 && (
            forComponents.length > 0 ? (
              <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
                {t('tutorials.forComponents', { components: componentsLabel(t, components) })}
              </h2>
            ) : (
              <>
                <div className="mb-6 rounded-lg border border-gray-300 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800">
                  <div className="flex items-start">
                    <span className="material-symbols-outlined mr-2 text-gray-500 dark:text-gray-300">info</span>
                    <p className="text-sm text-gray-700 dark:text-gray-200">
                      {t('tutorials.noneForComponents', { components: componentsLabel(t, components) })}
                    </p>
                  </div>
                </div>
                <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
                  {t('tutorials.otherForDevice')}
                </h2>
              </>
            )
          )}

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {tutorials.length > 0 ? (
                  (forComponents.length > 0 ? forComponents : otherTutorials).map(renderTutorial)
              ) : (
                <div className="col-span-full text-center py-12">
                    <span className="material-symbols-outlined text-6xl text-gray-400 dark:text-gray-500">sentiment_dissatisfied</span>
                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mt-4">{t('tutorials.noTutorials', { device: deviceName })}</h3>
                    <p className="text-gray-500 dark:text-gray-400">{t('tutorials.noTutorialsHint')}</p>
                </div>
              )}
          </div>

          {forComponents.length > 0 && otherTutorials.length > 0 && (
            <>
              <h2 className="mt-8 mb-4 text-lg font-bold text-gray-900 dark:text-white">
                {t('tutorials.otherForDevice')}
              </h2>
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {otherTutorials.map(renderTutorial)}
              </div>
            </>
          )}

          {wantsVideos && (
            <div className="mt-8">
              <div className="flex items-center mb-2">
                <span className="material-symbols-outlined text-2xl text-red-600 dark:text-red-400 mr-2">smart_display</span>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {t('tutorials.youtube.title')}
                </h2>
              </div>
              {/* iFixit covers computers and phones; most of what our users
                  repair is household appliances and textile, where YouTube is
                  the only practical source. It is unvetted, and says so. */}
              <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                {t('tutorials.youtube.unverified')}
              </p>
              {videosLoading ? (
                <div className="flex justify-center items-center h-32">
                  <Loader color="orange" size="sm" />
                </div>
              ) : videos.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {videos.map((video) => (
                    <a
                      key={video.videoId}
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-50 dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden transform hover:-translate-y-1 transition-all duration-300 flex flex-col"
                    >
                      {video.thumbnail && (
                        <img src={video.thumbnail} alt={video.title} className="w-full h-40 object-cover" />
                      )}
                      <div className="p-4">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">{video.title}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{video.channelTitle}</p>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('tutorials.youtube.noVideos')}</p>
              )}
            </div>
          )}
      </div>
    </>
  );
};

export default IfixitTutorials;