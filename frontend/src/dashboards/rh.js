import { group, avg, sum, topEntries, avgGroup, filterSpecs } from '../lib/model';
import { euro, pct, compact } from '../lib/format';
import { palette } from '../lib/charts';

const EXP_ORDER = ['0-4 ans', '5-9 ans', '10-14 ans', '15+ ans'];

const T = 'dashboards.rh';

export default {
  key: 'rh',
  filters: filterSpecs.rh,
  datasets: ['presence', 'employees'],

  kpis(f, t) {
    const r = f.presence;
    const emp = f.employees;
    const late = avg(r, (x) => x.late);
    const present = avg(r, (x) => x.present);
    // Dedupe by driver within the *filtered* presence rows (fixes a bug in the original vanilla-JS
    // version, which deduped against the unfiltered global model and so ignored active filters here).
    const driverSalaries = [...new Map(r.map((x) => [x.driver, x])).values()];

    return [
      { label: t(`${T}.kpis.heures`), value: compact(sum(r, (x) => x.workedHours)), status: 'neutral' },
      { label: t(`${T}.kpis.presence`), value: pct(present), status: present >= 0.94 ? 'good' : present >= 0.88 ? 'warn' : 'bad' },
      { label: t(`${T}.kpis.retards`), value: pct(late), status: late <= 0.05 ? 'good' : late <= 0.12 ? 'warn' : 'bad' },
      { label: t(`${T}.kpis.experience`), value: `${avg(r, (x) => x.experience).toFixed(1)} ans`, status: 'neutral' },
      { label: t(`${T}.kpis.masseSalariale`), value: euro(sum(driverSalaries, (x) => x.salary)), status: 'neutral' },
      { label: t(`${T}.kpis.effectifSiege`), value: String(emp.length), status: 'neutral' },
    ];
  },

  charts(f, t) {
    const r = f.presence;
    const emp = f.employees;
    const present = avg(r, (x) => x.present);
    const status = group(r, (x) => x.status);
    const hours = group(r, (x) => x.country, (x) => x.workedHours);
    const lateDrivers = topEntries(avgGroup(r, (x) => x.driver, (x) => x.late), 8);
    const exp = group(r, (x) => x.experienceBand);
    const absence = avgGroup(r, (x) => x.experienceBand, (x) => x.absence);
    const expKeys = EXP_ORDER.filter((k) => absence.has(k));
    const dept = group(emp, (x) => x.department);

    return [
      { id: 'rhGauge', kind: 'gauge', title: t(`${T}.charts.rhGauge.title`), description: t(`${T}.charts.rhGauge.description`), value: present, target: 0.95, label: t(`${T}.charts.rhGauge.label`) },
      { id: 'rhStatus', kind: 'chart', title: t(`${T}.charts.rhStatus.title`), description: t(`${T}.charts.rhStatus.description`),
        type: 'pie', labels: [...status.keys()], datasets: [{ data: [...status.values()], backgroundColor: [palette.green2, palette.amber, palette.red] }] },
      { id: 'rhCountry', kind: 'chart', title: t(`${T}.charts.rhCountry.title`), description: t(`${T}.charts.rhCountry.description`),
        type: 'bar', labels: [...hours.keys()], datasets: [{ data: [...hours.values()], backgroundColor: palette.green }] },
      { id: 'rhDrivers', kind: 'chart', title: t(`${T}.charts.rhDrivers.title`), description: t(`${T}.charts.rhDrivers.description`),
        type: 'bar', labels: lateDrivers.map((x) => x[0]), datasets: [{ data: lateDrivers.map((x) => x[1] * 100), backgroundColor: palette.red }], options: { indexAxis: 'y' } },
      { id: 'rhExperience', kind: 'chart', title: t(`${T}.charts.rhExperience.title`), description: t(`${T}.charts.rhExperience.description`),
        type: 'bar', labels: [...exp.keys()], datasets: [{ data: [...exp.values()], backgroundColor: palette.blue }] },
      { id: 'rhAbsence', kind: 'chart', title: t(`${T}.charts.rhAbsence.title`), description: t(`${T}.charts.rhAbsence.description`),
        type: 'bar', labels: expKeys, datasets: [{ data: expKeys.map((k) => absence.get(k) * 100), backgroundColor: palette.amber }] },
      { id: 'rhDept', kind: 'chart', title: t(`${T}.charts.rhDept.title`), description: t(`${T}.charts.rhDept.description`),
        type: 'doughnut', labels: [...dept.keys()], datasets: [{ data: [...dept.values()], backgroundColor: [palette.green, palette.blue, palette.amber, palette.purple] }] },
    ];
  },
};
