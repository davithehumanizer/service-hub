export type RepairerSearchDto = {
  search: string;
  filters: { [key: string]: string };
  latitude?: number;
  longitude?: number;
};
