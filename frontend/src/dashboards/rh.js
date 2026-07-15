import { group, avg, sum, topEntries, avgGroup, filterSpecs } from '../lib/model';
import { euro, pct, compact } from '../lib/format';
import { palette } from '../lib/charts';

const EXP_ORDER = ['0-4 ans', '5-9 ans', '10-14 ans', '15+ ans'];

export default {
  key: 'rh',
  title: 'Dashboard RH Chauffeurs',
  subtitle: 'Presence chauffeurs, retards, heures travaillees, experience et disponibilite.',
  filters: filterSpecs.rh,
  datasets: ['presence', 'employees'],

  kpis(f) {
    const r = f.presence;
    const emp = f.employees;
    const late = avg(r, (x) => x.late);
    const present = avg(r, (x) => x.present);
    // Dedupe by driver within the *filtered* presence rows (fixes a bug in the original vanilla-JS
    // version, which deduped against the unfiltered global model and so ignored active filters here).
    const driverSalaries = [...new Map(r.map((x) => [x.driver, x])).values()];

    return [
      { label: 'Heures', value: compact(sum(r, (x) => x.workedHours)), status: 'neutral' },
      { label: 'Presence', value: pct(present), status: present >= 0.94 ? 'good' : present >= 0.88 ? 'warn' : 'bad' },
      { label: 'Retards', value: pct(late), status: late <= 0.05 ? 'good' : late <= 0.12 ? 'warn' : 'bad' },
      { label: 'Experience', value: `${avg(r, (x) => x.experience).toFixed(1)} ans`, status: 'neutral' },
      { label: 'Masse salariale chauffeurs', value: euro(sum(driverSalaries, (x) => x.salary)), status: 'neutral' },
      { label: 'Effectif siege', value: String(emp.length), status: 'neutral' },
    ];
  },

  charts(f) {
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
      { id: 'rhGauge', kind: 'gauge', title: 'Jauge presence', description: 'Taux de presence par rapport a la cible RH.', value: present, target: 0.95, label: 'Presence' },
      { id: 'rhStatus', kind: 'chart', title: 'Statut presence', description: 'Camembert des presences, retards et absences.',
        type: 'pie', labels: [...status.keys()], datasets: [{ data: [...status.values()], backgroundColor: [palette.green2, palette.amber, palette.red] }] },
      { id: 'rhCountry', kind: 'chart', title: 'Heures par pays', description: 'Volume RH mobilise par pays.',
        type: 'bar', labels: [...hours.keys()], datasets: [{ data: [...hours.values()], backgroundColor: palette.green }] },
      { id: 'rhDrivers', kind: 'chart', title: 'Chauffeurs avec plus de retards', description: 'Classement des chauffeurs a surveiller.',
        type: 'bar', labels: lateDrivers.map((x) => x[0]), datasets: [{ data: lateDrivers.map((x) => x[1] * 100), backgroundColor: palette.red }], options: { indexAxis: 'y' } },
      { id: 'rhExperience', kind: 'chart', title: 'Experience chauffeurs', description: 'Distribution des chauffeurs par anciennete.',
        type: 'bar', labels: [...exp.keys()], datasets: [{ data: [...exp.values()], backgroundColor: palette.blue }] },
      { id: 'rhAbsence', kind: 'chart', title: 'Absenteisme par anciennete', description: "Le turnover/absence varie-t-il avec l'experience ?",
        type: 'bar', labels: expKeys, datasets: [{ data: expKeys.map((k) => absence.get(k) * 100), backgroundColor: palette.amber }] },
      { id: 'rhDept', kind: 'chart', title: 'Effectifs siege par departement', description: 'Repartition du personnel hors chauffeurs (dim_employee).',
        type: 'doughnut', labels: [...dept.keys()], datasets: [{ data: [...dept.values()], backgroundColor: [palette.green, palette.blue, palette.amber, palette.purple] }] },
    ];
  },
};
