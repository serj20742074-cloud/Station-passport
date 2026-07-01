/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StationData, StationClass, StationStaff, StationIndicator } from '../types';

export const STATIONS: StationData[] = [
  // MAIN HORIZONTAL LINE - PART 1 (WEST TO EAST)
  { id: 'rudnya', name: 'Рудня', classType: StationClass.CLASS_5, km: '456,2', connections: ['golynki'], x: 105, y: 110, labelPosition: 'right', labelAngle: -45 },
  { id: 'golynki', name: 'Голынки', classType: StationClass.CLASS_5, km: '432,9', connections: ['rudnya', 'kuprino'], x: 175, y: 160, labelPosition: 'right', labelAngle: -45 },
  { id: 'kuprino', name: 'Куприно', classType: StationClass.CLASS_5, km: '411,1', connections: ['golynki', 'gnezdovo'], x: 235, y: 205, labelPosition: 'right', labelAngle: -45 },
  
  // SOUTHERN SPLIT
  { id: 'krasnoe', name: 'Красное', classType: StationClass.CLASS_5, km: '486,6', connections: ['gusino'], x: 75, y: 330, labelPosition: 'right', labelAngle: -45 },
  { id: 'gusino', name: 'Гусино', classType: StationClass.CLASS_5, km: '464,3', connections: ['krasnoe', 'gnezdovo'], x: 155, y: 330, labelPosition: 'right', labelAngle: -45 },
  
  // MERGE POINT
  { id: 'gnezdovo', name: 'Гнездово', classType: StationClass.CLASS_5, km: '400,9', connections: ['kuprino', 'gusino', 'smolensk', 'rakitnaya'], x: 270, y: 330, labelPosition: 'bottom' },
  
  // UPPER LOOP
  { id: 'rakitnaya', name: 'Ракитная', classType: StationClass.CLASS_5, km: '433,9', connections: ['gnezdovo', 'krasny_bor'], x: 280, y: 230, labelPosition: 'right', labelAngle: -45 },
  { id: 'krasny_bor', name: 'Красный Бор', classType: StationClass.CLASS_3, km: '427,3', connections: ['rakitnaya', 'smolensk'], x: 335, y: 255, labelPosition: 'right', labelAngle: -45 },

  // SMOLENSK HUB
  { id: 'smolensk', name: 'Смоленск', classType: StationClass.CLASS_1, km: '418,6', connections: ['gnezdovo', 'krasny_bor', 'smolensk_sort', 'novosmolenskaya'], x: 410, y: 270, labelPosition: 'right', labelAngle: -45 },
  { id: 'smolensk_sort', name: 'Смоленск - Сорт.', classType: StationClass.EXTRA, km: '412,4', connections: ['smolensk', 'dukhovskaya', 'valutino'], x: 485, y: 270, labelPosition: 'right', labelAngle: -45 },
  
  // TO EAST FROM SMOLENSK-SORT
  { id: 'dukhovskaya', name: 'Духовская', classType: StationClass.CLASS_5, km: '402,5', connections: ['smolensk_sort', 'kardymovo'], x: 545, y: 270, labelPosition: 'right', labelAngle: -60 },
  { id: 'kardymovo', name: 'Кардымово', classType: StationClass.CLASS_4, km: '384,6', connections: ['dukhovskaya', 'yartsevo'], x: 580, y: 270, labelPosition: 'right', labelAngle: -60 },
  { id: 'yartsevo', name: 'Ярцево', classType: StationClass.CLASS_4, km: '356,1', connections: ['kardymovo', 'milokhovo'], x: 610, y: 270, labelPosition: 'right', labelAngle: -60 },
  { id: 'milokhovo', name: 'Милохово', classType: StationClass.CLASS_4, km: '347,1', connections: ['yartsevo', 'safonovo'], x: 640, y: 270, labelPosition: 'right', labelAngle: -60 },
  
  // SAFONOVO HUB
  { id: 'safonovo', name: 'Сафоново', classType: StationClass.CLASS_2, km: '316,5', connections: ['milokhovo', 'durovo', 'azotnaya', 'igorevskaya'], x: 675, y: 270, labelPosition: 'right', labelAngle: -60 },
  { id: 'azotnaya', name: 'Азотная', classType: StationClass.CLASS_2, km: '20,3', connections: ['safonovo'], x: 675, y: 340, labelPosition: 'right' },
  
  // VLADIMIRSKY BRANCH
  { id: 'igorevskaya', name: 'Игоревская', classType: StationClass.CLASS_4, km: '40,6', connections: ['safonovo', 'vladimirsky_tupik'], x: 715, y: 210, labelPosition: 'right' },
  { id: 'vladimirsky_tupik', name: 'Владимирский Тупик', classType: StationClass.CLASS_5, km: '69,8', connections: ['igorevskaya'], x: 715, y: 120, labelPosition: 'right' },
  
  // EAST OF SAFONOVO
  { id: 'durovo', name: 'Дурово', classType: StationClass.CLASS_4, km: '307,7', connections: ['safonovo', 'izdeshkovo'], x: 710, y: 270, labelPosition: 'right', labelAngle: -60 },
  { id: 'izdeshkovo', name: 'Издешково', classType: StationClass.CLASS_5, km: '290,2', connections: ['durovo', 'semlevo'], x: 735, y: 270, labelPosition: 'right', labelAngle: -60 },
  { id: 'semlevo', name: 'Семлево', classType: StationClass.CLASS_5, km: '265,8', connections: ['izdeshkovo', 'vyazma'], x: 760, y: 270, labelPosition: 'right', labelAngle: -60 },
  
  // VYAZMA HUB
  { id: 'vyazma', name: 'Вязьма', classType: StationClass.EXTRA, km: '243,1', connections: ['semlevo', 'vyazma_novotor', 'meshcherskaya', 'vyazma_bryanskaya'], x: 815, y: 270, labelPosition: 'right', labelAngle: -60 },
  
  // NORTH OF VYAZMA
  { id: 'vyazma_novotor', name: 'Вязьма - Новоторжская', classType: StationClass.CLASS_4, km: '255,8', connections: ['vyazma', 'novoduginskaya'], x: 830, y: 190, labelPosition: 'right' },
  { id: 'novoduginskaya', name: 'Новодугинская', classType: StationClass.CLASS_4, km: '209,7', connections: ['vyazma_novotor', 'sychevka'], x: 830, y: 130, labelPosition: 'right' },
  { id: 'sychevka', name: 'Сычевка', classType: StationClass.CLASS_5, km: '185,0', connections: ['novoduginskaya'], x: 830, y: 70, labelPosition: 'right' },
 
  // EAST OF VYAZMA (TOWARDS MOSCOW)
  { id: 'meshcherskaya', name: 'Мещерская', classType: StationClass.CLASS_5, km: '223,7', connections: ['vyazma', 'tumanovo'], x: 860, y: 270, labelPosition: 'right', labelAngle: -60 },
  { id: 'tumanovo', name: 'Туманово', classType: StationClass.CLASS_5, km: '208,1', connections: ['meshcherskaya', 'gagarin'], x: 895, y: 270, labelPosition: 'right', labelAngle: -60 },
  { id: 'gagarin', name: 'Гагарин', classType: StationClass.CLASS_3, km: '180,3', connections: ['tumanovo', 'putevoy_post_161'], x: 935, y: 270, labelPosition: 'right', labelAngle: -60 },
  { id: 'putevoy_post_161', name: 'Путевой пост 161 км', classType: StationClass.CLASS_5, km: '160,2', connections: ['gagarin', 'uvarovka'], x: 975, y: 270, labelPosition: 'right', labelAngle: -60 },
  { id: 'uvarovka', name: 'Уваровка', classType: StationClass.CLASS_5, km: '121,4', connections: ['putevoy_post_161', 'borodino'], x: 1015, y: 270, labelPosition: 'right', labelAngle: -60 },
  { id: 'borodino', name: 'Бородино', classType: StationClass.CLASS_5, km: '121,4', connections: ['uvarovka'], x: 1055, y: 270, labelPosition: 'right', labelAngle: -60 },
 
  // SOUTH OF VYAZMA
  { id: 'vyazma_bryanskaya', name: 'Вязьма-Брянская', classType: StationClass.CLASS_4, km: '6,7', connections: ['vyazma', 'volosta_pyatnitsa', 'baskakovka'], x: 815, y: 350, labelPosition: 'right' },
  { id: 'volosta_pyatnitsa', name: 'Волоста-Пятница', classType: StationClass.CLASS_5, km: '23,2', connections: ['vyazma_bryanskaya', 'temkino'], x: 860, y: 420, labelPosition: 'right' },
  { id: 'temkino', name: 'Тёмкино', classType: StationClass.CLASS_2, km: '52,8', connections: ['volosta_pyatnitsa'], x: 915, y: 420, labelPosition: 'right' },
 
  // SOUTHWARDS FROM SMOLENSK
  { id: 'novosmolenskaya', name: 'Новосмоленская', classType: StationClass.CLASS_4, km: '15,8', connections: ['smolensk'], x: 410, y: 360, labelPosition: 'left' },
  { id: 'valutino', name: 'Валутино', classType: StationClass.CLASS_5, km: '377,2', connections: ['smolensk_sort', 'tychinino', 'dobromino'], x: 550, y: 320, labelPosition: 'right' },
  { id: 'dobromino', name: 'р. Добромино', classType: StationClass.CLASS_5, km: '544,9', connections: ['valutino', 'elnya'], x: 605, y: 360, labelPosition: 'top' },
  
  { id: 'tychinino', name: 'Тычинино', classType: StationClass.CLASS_5, km: '363,2', connections: ['valutino', 'ryabtsevo'], x: 550, y: 380, labelPosition: 'right' },
  { id: 'ryabtsevo', name: 'Рябцево', classType: StationClass.CLASS_5, km: '353,2', connections: ['tychinino', 'peresna'], x: 550, y: 440, labelPosition: 'right' },
  { id: 'peresna', name: 'Пересна', classType: StationClass.CLASS_5, km: '337,7', connections: ['ryabtsevo', 'pochinok'], x: 550, y: 500, labelPosition: 'right' },
  { id: 'pochinok', name: 'Починок', classType: StationClass.CLASS_4, km: '324,9', connections: ['peresna', 'engelgardtovskaya'], x: 550, y: 560, labelPosition: 'left' },
  { id: 'engelgardtovskaya', name: 'Энгельгардтовская', classType: StationClass.CLASS_5, km: '316,5', connections: ['pochinok', 'stodolishche'], x: 550, y: 620, labelPosition: 'right' },
  { id: 'stodolishche', name: 'Стодолище', classType: StationClass.CLASS_5, km: '296,5', connections: ['engelgardtovskaya', 'kozlovka'], x: 550, y: 680, labelPosition: 'right' },
  { id: 'kozlovka', name: 'Козловка', classType: StationClass.CLASS_5, km: '271,8', connections: ['stodolishche', 'roslavl_1'], x: 550, y: 740, labelPosition: 'right' },
  
  // ROSLAVL HUB
  { id: 'roslavl_1', name: 'Рославль I', classType: StationClass.CLASS_3, km: '266,4', connections: ['kozlovka', 'ponyatovka', 'aselye'], x: 550, y: 830, labelPosition: 'bottom' },
  { id: 'ponyatovka', name: 'Понятовка', classType: StationClass.CLASS_5, km: '286,3', connections: ['roslavl_1'], x: 440, y: 830, labelPosition: 'top' },
  
  // EAST OF ROSLAVL
  { id: 'aselye', name: 'Аселье', classType: StationClass.CLASS_5, km: '19,3', connections: ['roslavl_1', 'betlitsa'], x: 620, y: 830, labelPosition: 'top', labelAngle: -60 },
  { id: 'betlitsa', name: 'Бетлица', classType: StationClass.CLASS_5, km: '68,5', connections: ['aselye', 'podpisnaya'], x: 680, y: 830, labelPosition: 'top', labelAngle: -60 },
  { id: 'podpisnaya', name: 'Подписная', classType: StationClass.CLASS_5, km: '90,5', connections: ['betlitsa', 'fayansovaya'], x: 740, y: 830, labelPosition: 'top', labelAngle: -60 },
  
  // FAYANSOVAYA HUB
  { id: 'fayansovaya', name: 'Фаянсовая', classType: StationClass.CLASS_3, km: '102/134', connections: ['podpisnaya', 'shaykovka', 'lyudinovo_2'], x: 840, y: 830, labelPosition: 'bottom' },
  
  // FAYANSOVAYA TO NORTH-WEST LOOP
  { id: 'shaykovka', name: 'Шайковка', classType: StationClass.CLASS_5, km: '114,1', connections: ['fayansovaya', 'zanoznaya'], x: 840, y: 740, labelPosition: 'bottom' },
  { id: 'zanoznaya', name: 'Занозная', classType: StationClass.CLASS_5, km: '429/99', connections: ['shaykovka', 'baryatinskaya', 'spas_demensk', 'baskakovka'], x: 840, y: 680, labelPosition: 'bottom' },
  { id: 'baryatinskaya', name: 'Барятинская', classType: StationClass.CLASS_5, km: '414,6', connections: ['zanoznaya'], x: 910, y: 680, labelPosition: 'top' },
  { id: 'spas_demensk', name: 'Спас-Деменск', classType: StationClass.CLASS_5, km: '449,3', connections: ['zanoznaya', 'pavlinovo'], x: 750, y: 540, labelPosition: 'top' },
  { id: 'pavlinovo', name: 'р. Павлиново', classType: StationClass.CLASS_5, km: '469,6', connections: ['spas_demensk', 'elnya'], x: 695, y: 480, labelPosition: 'top' },
  { id: 'elnya', name: 'Ельня', classType: StationClass.CLASS_4, km: '510,0', connections: ['pavlinovo', 'dobromino'], x: 640, y: 420, labelPosition: 'top' },
 
  // SOUTH BRANCH OF FAYANSOVAYA
  { id: 'lyudinovo_2', name: 'Людиново II', classType: StationClass.CLASS_3, km: '153,7', connections: ['fayansovaya', 'lyudinovo_1'], x: 880, y: 850, labelPosition: 'right' },
  { id: 'lyudinovo_1', name: 'Людиново I', classType: StationClass.CLASS_3, km: '160,3', connections: ['lyudinovo_2'], x: 935, y: 890, labelPosition: 'right' },
 
  // NORTH BRANCH OF FAYANSOVAYA / ZANOZNAYA
  { id: 'ugra', name: 'Угра', classType: StationClass.CLASS_5, km: '48,2', connections: ['vyazma_bryanskaya', 'baskakovka'], x: 830, y: 500, labelPosition: 'right' },
  { id: 'baskakovka', name: 'Баскаковка', classType: StationClass.CLASS_5, km: '67,3', connections: ['ugra', 'zanoznaya'], x: 840, y: 580, labelPosition: 'right' },
];

// PRE-SEEDED STAFF TEMPLATE DATA
export const DEFAULT_STAFF: Record<string, StationStaff[]> = {
  smolensk: [
    { id: '1', position: 'Начальник станции', fullName: 'Иванов Сергей Петрович', phone: '+7 (910) 785-12-34', email: 'ivanov.sp@mzd.ru' },
    { id: '2', position: 'Заместитель начальника станции', fullName: 'Петров Алексей Владимирович', phone: '+7 (910) 785-12-35', email: 'petrov.av@mzd.ru' },
    { id: '3', position: 'Главный инженер', fullName: 'Сидоров Дмитрий Николаевич', phone: '+7 (910) 785-12-36', email: 'sidorov.dn@mzd.ru' },
    { id: '4', position: 'Старший дежурный по станции', fullName: 'Кузнецова Елена Михайловна', phone: '+7 (910) 785-12-37', email: 'kuznetsova.em@mzd.ru' },
    { id: '5', position: 'Дежурный по станции', fullName: 'Смирнов Игорь Олегович', phone: '+7 (910) 785-12-38', email: 'smirnov.io@mzd.ru' },
  ],
  smolensk_sort: [
    { id: '1', position: 'Начальник станции', fullName: 'Козлов Михаил Юрьевич', phone: '+7 (910) 721-44-11', email: 'kozlov.my@mzd.ru' },
    { id: '2', position: 'Главный инженер', fullName: 'Васильев Андрей Семенович', phone: '+7 (910) 721-44-12', email: 'vasiliev.as@mzd.ru' },
    { id: '3', position: 'Мастер маневровый', fullName: 'Павлов Виктор Игоревич', phone: '+7 (910) 721-44-13', email: 'pavlov.vi@mzd.ru' },
    { id: '4', position: 'Дежурный по горке', fullName: 'Федоров Роман Геннадьевич', phone: '+7 (910) 721-44-14', email: 'fedorov.rg@mzd.ru' },
  ],
  vyazma: [
    { id: '1', position: 'Начальник станции', fullName: 'Александров Илья Андреевич', phone: '+7 (905) 698-22-33', email: 'alexandrov.ia@mzd.ru' },
    { id: '2', position: 'Заместитель начальника станции', fullName: 'Морозов Константин Борисович', phone: '+7 (905) 698-22-34', email: 'morozov.kb@mzd.ru' },
    { id: '3', position: 'Дежурный по станции', fullName: 'Дмитриева Ольга Васильевна', phone: '+7 (905) 698-22-35', email: 'dmitrieva.ov@mzd.ru' },
  ],
  safonovo: [
    { id: '1', position: 'Начальник станции', fullName: 'Григорьев Денис Сергеевич', phone: '+7 (915) 634-88-99', email: 'grigoriev.ds@mzd.ru' },
    { id: '2', position: 'Дежурный по станции', fullName: 'Соколова Наталья Павловна', phone: '+7 (915) 634-88-90', email: 'sokolova.np@mzd.ru' },
  ],
  roslavl_1: [
    { id: '1', position: 'Начальник станции', fullName: 'Николаев Юрий Александрович', phone: '+7 (920) 811-55-77', email: 'nikolaev.ya@mzd.ru' },
    { id: '2', position: 'Дежурный по станции', fullName: 'Михайлов Владимир Анатольевич', phone: '+7 (920) 811-55-78', email: 'mikhailov.va@mzd.ru' },
  ],
  fayansovaya: [
    { id: '1', position: 'Начальник станции', fullName: 'Степанов Павел Кириллович', phone: '+7 (910) 150-33-44', email: 'stepanov.pk@mzd.ru' },
    { id: '2', position: 'Дежурный по станции', fullName: 'Новиков Артем Валерьевич', phone: '+7 (910) 150-33-45', email: 'novikov.av@mzd.ru' },
  ],
};

// PRE-SEEDED INDICATORS TEMPLATE DATA
export const DEFAULT_INDICATORS: Record<string, StationIndicator[]> = {
  smolensk: [
    { id: '1', metric: 'Погрузка грузов', unit: 'тонн', plan: 12000, fact: 12450, percent: 103.8 },
    { id: '2', metric: 'Выгрузка грузов', unit: 'тонн', plan: 18000, fact: 17890, percent: 99.4 },
    { id: '3', metric: 'Простой под одной грузовой операцией', unit: 'час', plan: 24.5, fact: 23.8, percent: 102.9 }, // 102.9% efficiency (less time is better)
    { id: '4', metric: 'Прием поездов', unit: 'поездов', plan: 450, fact: 462, percent: 102.7 },
    { id: '5', metric: 'Отправление поездов', unit: 'поездов', plan: 450, fact: 460, percent: 102.2 },
    { id: '6', metric: 'Пассажиропоток дальнего следования', unit: 'чел/сут', plan: 1500, fact: 1620, percent: 108.0 },
    { id: '7', metric: 'Пассажиропоток пригородного сообщения', unit: 'чел/сут', plan: 3200, fact: 3150, percent: 98.4 },
  ],
  smolensk_sort: [
    { id: '1', metric: 'Переработка вагонов на горке', unit: 'вагонов/сут', plan: 2800, fact: 2950, percent: 105.4 },
    { id: '2', metric: 'Простой транзитного вагона с переработкой', unit: 'час', plan: 8.5, fact: 8.1, percent: 104.9 },
    { id: '3', metric: 'Простой транзитного вагона без переработки', unit: 'час', plan: 2.1, fact: 1.9, percent: 110.5 },
    { id: '4', metric: 'Погрузка грузов', unit: 'тонн', plan: 5000, fact: 5200, percent: 104.0 },
    { id: '5', metric: 'Выгрузка грузов', unit: 'тонн', plan: 8500, fact: 8900, percent: 104.7 },
  ],
  vyazma: [
    { id: '1', metric: 'Погрузка грузов', unit: 'тонн', plan: 8000, fact: 8150, percent: 101.9 },
    { id: '2', metric: 'Выгрузка грузов', unit: 'тонн', plan: 9500, fact: 9320, percent: 98.1 },
    { id: '3', metric: 'Прием поездов', unit: 'поездов', plan: 380, fact: 385, percent: 101.3 },
    { id: '4', metric: 'Отправление поездов', unit: 'поездов', plan: 380, fact: 382, percent: 100.5 },
    { id: '5', metric: 'Пассажиропоток', unit: 'чел/сут', plan: 1800, fact: 1950, percent: 108.3 },
  ],
  safonovo: [
    { id: '1', metric: 'Погрузка грузов', unit: 'тонн', plan: 4500, fact: 4800, percent: 106.7 },
    { id: '2', metric: 'Выгрузка грузов', unit: 'тонн', plan: 6000, fact: 5910, percent: 98.5 },
    { id: '3', metric: 'Простой вагонов', unit: 'час', plan: 18.0, fact: 17.2, percent: 104.7 },
  ],
  roslavl_1: [
    { id: '1', metric: 'Погрузка грузов', unit: 'тонн', plan: 6500, fact: 6720, percent: 103.4 },
    { id: '2', metric: 'Выгрузка грузов', unit: 'тонн', plan: 5000, fact: 5120, percent: 102.4 },
    { id: '3', metric: 'Оборот местного вагона', unit: 'сут', plan: 1.5, fact: 1.4, percent: 107.1 },
  ],
  fayansovaya: [
    { id: '1', metric: 'Погрузка грузов', unit: 'тонн', plan: 3000, fact: 3100, percent: 103.3 },
    { id: '2', metric: 'Выгрузка грузов', unit: 'тонн', plan: 4000, fact: 3850, percent: 96.3 },
    { id: '3', metric: 'Прием поездов', unit: 'поездов', plan: 120, fact: 124, percent: 103.3 },
  ],
};

// HELPER FOR STATION CLASS STYLING & TEXT
export const STATION_CLASS_INFO: Record<StationClass, { label: string; color: string; bg: string; border: string; desc: string }> = {
  [StationClass.EXTRA]: {
    label: 'Внеклассная',
    color: 'text-red-600 bg-red-50 border-red-200',
    bg: '#e21a1a',
    border: '#a81010',
    desc: 'Крупнейшие сортировочные, пассажирские и грузовые станции с огромным объемом работы.',
  },
  [StationClass.CLASS_1]: {
    label: 'I класс',
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    bg: '#009a49',
    border: '#006e33',
    desc: 'Важные узловые станции с высоким уровнем пассажирских и грузовых операций.',
  },
  [StationClass.CLASS_2]: {
    label: 'II класс',
    color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
    bg: '#00aef0',
    border: '#0083b5',
    desc: 'Станции среднего уровня с развитой грузовой работой и пассажирским движением.',
  },
  [StationClass.CLASS_3]: {
    label: 'III класс',
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    bg: '#ffdd00',
    border: '#baa200',
    desc: 'Участковые и промежуточные станции с умеренным объемом работы.',
  },
  [StationClass.CLASS_4]: {
    label: 'IV класс',
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    bg: '#f26522',
    border: '#bf4b13',
    desc: 'Промежуточные станции, выполняющие в основном разъездную и местную работу.',
  },
  [StationClass.CLASS_5]: {
    label: 'V класс',
    color: 'text-lime-700 bg-lime-50 border-lime-200',
    bg: '#c9e2b1',
    border: '#537d45',
    desc: 'Малые промежуточные станции, остановочные пункты и разъезды.',
  },
};
