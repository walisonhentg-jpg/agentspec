export type RegionGroup = 'usa' | 'uk' | 'europe';
export type CountryCode = 'US' | 'GB' | 'DE' | 'FR' | 'ES' | 'IT' | 'NL' | 'PL' | 'SE' | 'IE';
export type GenderFilter = 'all' | 'male' | 'female';

export interface CountryOption {
  code: CountryCode;
  name: string;
  regionGroup: RegionGroup;
  dialCode: string;
}

export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'US', name: 'United States', regionGroup: 'usa', dialCode: '+1' },
  { code: 'GB', name: 'United Kingdom', regionGroup: 'uk', dialCode: '+44' },
  { code: 'DE', name: 'Germany', regionGroup: 'europe', dialCode: '+49' },
  { code: 'FR', name: 'France', regionGroup: 'europe', dialCode: '+33' },
  { code: 'ES', name: 'Spain', regionGroup: 'europe', dialCode: '+34' },
  { code: 'IT', name: 'Italy', regionGroup: 'europe', dialCode: '+39' },
  { code: 'NL', name: 'Netherlands', regionGroup: 'europe', dialCode: '+31' },
  { code: 'PL', name: 'Poland', regionGroup: 'europe', dialCode: '+48' },
  { code: 'SE', name: 'Sweden', regionGroup: 'europe', dialCode: '+46' },
  { code: 'IE', name: 'Ireland', regionGroup: 'europe', dialCode: '+353' },
];

export interface UsCitySpec {
  city: string;
  state: string;
  zips: string[];
  areaCodes: string[];
}

export interface UkCitySpec {
  city: string;
  county: string;
  outwardCodes: string[];
}

export interface EuropeCountrySpec {
  code: string;
  country: string;
  dialCode: string;
  mobilePrefixes: string[];
  phoneDigitsAfterPrefix: number;
  maleFirst: string[];
  femaleFirst: string[];
  lastNames: string[];
  streets: string[];
  cities: Array<{ city: string; region: string; postalPrefixes: string[]; postalDigits: number }>;
  locale: string;
}

export const US_MALE_FIRST = [
  'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph',
  'Thomas', 'Christopher', 'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark',
  'Donald', 'Steven', 'Andrew', 'Paul', 'Joshua', 'Kenneth', 'Kevin', 'Brian',
  'George', 'Timothy', 'Ronald', 'Jason', 'Edward', 'Jeffrey', 'Ryan', 'Jacob',
  'Gary', 'Nicholas', 'Eric', 'Jonathan', 'Stephen', 'Larry', 'Justin', 'Scott',
  'Brandon', 'Benjamin', 'Samuel', 'Gregory', 'Alexander', 'Patrick', 'Frank',
  'Raymond', 'Jack', 'Dennis', 'Jerry', 'Tyler', 'Aaron', 'Jose', 'Adam',
  'Nathan', 'Henry', 'Zachary', 'Douglas', 'Peter', 'Kyle', 'Noah', 'Ethan',
  'Jeremy', 'Walter', 'Christian', 'Keith', 'Roger', 'Terry', 'Austin', 'Sean',
  'Gerald', 'Carl', 'Harold', 'Dylan', 'Arthur', 'Lawrence', 'Jordan', 'Jesse',
  'Bryan', 'Billy', 'Bruce', 'Gabriel', 'Joe', 'Logan', 'Alan', 'Juan',
  'Albert', 'Willie', 'Elijah', 'Wayne', 'Randy', 'Vincent', 'Mason', 'Roy',
  'Ralph', 'Bobby', 'Russell', 'Bradley', 'Philip', 'Eugene', 'Liam', 'Lucas',
];

export const US_FEMALE_FIRST = [
  'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan',
  'Jessica', 'Sarah', 'Karen', 'Lisa', 'Nancy', 'Betty', 'Sandra', 'Margaret',
  'Ashley', 'Kimberly', 'Emily', 'Donna', 'Michelle', 'Carol', 'Amanda',
  'Melissa', 'Deborah', 'Stephanie', 'Dorothy', 'Rebecca', 'Sharon', 'Laura',
  'Cynthia', 'Amy', 'Kathleen', 'Angela', 'Shirley', 'Brenda', 'Emma', 'Anna',
  'Pamela', 'Nicole', 'Samantha', 'Katherine', 'Christine', 'Helen', 'Debra',
  'Rachel', 'Carolyn', 'Janet', 'Maria', 'Catherine', 'Heather', 'Diane',
  'Olivia', 'Julie', 'Joyce', 'Victoria', 'Ruth', 'Virginia', 'Lauren', 'Kelly',
  'Christina', 'Joan', 'Evelyn', 'Judith', 'Andrea', 'Hannah', 'Megan', 'Cheryl',
  'Jacqueline', 'Martha', 'Madison', 'Teresa', 'Gloria', 'Sara', 'Janice',
  'Ann', 'Kathryn', 'Abigail', 'Sophia', 'Frances', 'Jean', 'Alice', 'Judy',
  'Isabella', 'Julia', 'Grace', 'Amber', 'Denise', 'Danielle', 'Marilyn',
  'Beverly', 'Charlotte', 'Natalie', 'Theresa', 'Diana', 'Brittany', 'Kayla',
  'Alexis', 'Lori', 'Marie', 'Chloe', 'Harper', 'Ava', 'Mia', 'Amelia',
];

export const US_LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill',
  'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell',
  'Mitchell', 'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz',
  'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales',
  'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson',
  'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson',
  'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza',
  'Ruiz', 'Hughes', 'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers',
  'Long', 'Ross', 'Foster', 'Jimenez', 'Powell', 'Jenkins', 'Perry', 'Russell',
  'Sullivan', 'Bell', 'Coleman', 'Butler', 'Henderson', 'Barnes', 'Gonzales',
];

export const US_STREETS = [
  'Oak Street', 'Maple Avenue', 'Cedar Lane', 'Washington Boulevard', 'Park Avenue',
  'Main Street', 'Broadway', 'Elm Street', 'Pine Street', 'Lexington Avenue',
  'Sunset Boulevard', 'Peachtree Street', 'Michigan Avenue', 'Boylston Street',
  'Congress Avenue', 'Market Street', 'Chestnut Street', 'Walnut Street',
  'Highland Avenue', 'Madison Avenue', 'Lincoln Avenue', 'Jefferson Street',
  'Franklin Street', 'River Road', 'Lakeview Drive', 'Forest Hills Drive',
  'Meadowbrook Lane', 'Sycamore Street', 'Willow Creek Road', 'Spring Street',
  'Church Street', 'Liberty Street', 'Ridgewood Avenue', 'Sunset Drive',
  'Valley View Road', 'Briarwood Lane', 'Fairview Avenue', 'Summit Avenue',
  'Hillcrest Drive', 'Prospect Street', 'Union Street', 'Pearl Street',
];

export const US_CITIES: UsCitySpec[] = [
  { city: 'New York', state: 'NY', zips: ['10001', '10003', '10011', '10016', '10019', '10023', '10025', '11201', '11215'], areaCodes: ['212', '646', '917', '347', '718'] },
  { city: 'Los Angeles', state: 'CA', zips: ['90001', '90012', '90024', '90028', '90036', '90046', '90049', '90064'], areaCodes: ['213', '310', '323', '424', '818'] },
  { city: 'Chicago', state: 'IL', zips: ['60601', '60607', '60611', '60614', '60618', '60622', '60647', '60657'], areaCodes: ['312', '773', '872'] },
  { city: 'Houston', state: 'TX', zips: ['77002', '77006', '77007', '77019', '77024', '77030', '77056', '77098'], areaCodes: ['713', '281', '832', '346'] },
  { city: 'Phoenix', state: 'AZ', zips: ['85004', '85008', '85014', '85016', '85018', '85022', '85032', '85044'], areaCodes: ['602', '480', '623'] },
  { city: 'Philadelphia', state: 'PA', zips: ['19102', '19103', '19104', '19107', '19123', '19130', '19146', '19147'], areaCodes: ['215', '267', '445'] },
  { city: 'San Antonio', state: 'TX', zips: ['78201', '78205', '78209', '78212', '78216', '78230', '78249', '78258'], areaCodes: ['210', '726'] },
  { city: 'San Diego', state: 'CA', zips: ['92101', '92103', '92104', '92109', '92111', '92122', '92126', '92130'], areaCodes: ['619', '858'] },
  { city: 'Dallas', state: 'TX', zips: ['75201', '75204', '75205', '75206', '75214', '75219', '75230', '75248'], areaCodes: ['214', '469', '972'] },
  { city: 'Austin', state: 'TX', zips: ['78701', '78702', '78704', '78705', '78723', '78745', '78757', '78759'], areaCodes: ['512', '737'] },
  { city: 'Seattle', state: 'WA', zips: ['98101', '98102', '98103', '98105', '98109', '98115', '98121', '98122'], areaCodes: ['206', '425'] },
  { city: 'Denver', state: 'CO', zips: ['80202', '80203', '80205', '80206', '80209', '80211', '80218', '80220'], areaCodes: ['303', '720'] },
  { city: 'Boston', state: 'MA', zips: ['02108', '02111', '02114', '02115', '02116', '02118', '02127', '02135'], areaCodes: ['617', '857'] },
  { city: 'Miami', state: 'FL', zips: ['33125', '33127', '33129', '33131', '33133', '33137', '33139', '33155'], areaCodes: ['305', '786'] },
  { city: 'Atlanta', state: 'GA', zips: ['30303', '30305', '30306', '30308', '30309', '30312', '30318', '30324'], areaCodes: ['404', '470', '678'] },
  { city: 'Orlando', state: 'FL', zips: ['32801', '32803', '32804', '32806', '32812', '32819', '32822', '32835'], areaCodes: ['407', '689', '321'] },
  { city: 'Charlotte', state: 'NC', zips: ['28202', '28203', '28204', '28205', '28207', '28209', '28210', '28277'], areaCodes: ['704', '980'] },
  { city: 'Nashville', state: 'TN', zips: ['37201', '37203', '37204', '37205', '37206', '37209', '37212', '37215'], areaCodes: ['615', '629'] },
  { city: 'Columbus', state: 'OH', zips: ['43201', '43202', '43205', '43206', '43212', '43214', '43215', '43220'], areaCodes: ['614', '380'] },
  { city: 'Minneapolis', state: 'MN', zips: ['55401', '55403', '55404', '55405', '55408', '55414', '55417', '55419'], areaCodes: ['612', '763', '651'] },
  { city: 'Portland', state: 'OR', zips: ['97201', '97204', '97205', '97209', '97211', '97214', '97215', '97217'], areaCodes: ['503', '971'] },
  { city: 'Las Vegas', state: 'NV', zips: ['89101', '89102', '89104', '89107', '89109', '89117', '89128', '89144'], areaCodes: ['702', '725'] },
];

export const UK_MALE_FIRST = [
  'Oliver', 'George', 'Arthur', 'Noah', 'Muhammad', 'Leo', 'Oscar', 'Harry',
  'Archie', 'Jack', 'Henry', 'Charlie', 'Freddie', 'Theodore', 'Thomas',
  'Alfie', 'Jacob', 'William', 'James', 'Edward', 'Alexander', 'Joshua',
  'Ethan', 'Lucas', 'Max', 'Harrison', 'Isaac', 'Sebastian', 'Samuel',
  'Benjamin', 'Daniel', 'Joseph', 'Adam', 'Dylan', 'Toby', 'Finley', 'Rory',
  'Jude', 'Mason', 'Elliot', 'Callum', 'Connor', 'Nathan', 'Matthew', 'Liam',
  'Alistair', 'Graham', 'Nigel', 'Simon', 'Gareth', 'Malcolm', 'Trevor',
  'Stephen', 'Richard', 'Peter', 'David', 'Andrew', 'Christopher', 'Jonathan',
  'Dominic', 'Reuben', 'Felix', 'Hugo', 'Jasper', 'Louis', 'Toby', 'Harvey',
];

export const UK_FEMALE_FIRST = [
  'Olivia', 'Amelia', 'Isla', 'Ava', 'Ivy', 'Freya', 'Lily', 'Florence',
  'Mia', 'Willow', 'Rosie', 'Sophia', 'Isabella', 'Grace', 'Poppy', 'Daisy',
  'Sienna', 'Elsie', 'Phoebe', 'Evelyn', 'Charlotte', 'Emily', 'Ella',
  'Harper', 'Matilda', 'Ruby', 'Alice', 'Millie', 'Chloe', 'Maya', 'Sofia',
  'Maisie', 'Jessica', 'Scarlett', 'Esme', 'Eva', 'Hannah', 'Eleanor',
  'Imogen', 'Lucy', 'Holly', 'Abigail', 'Georgia', 'Harriet', 'Victoria',
  'Rebecca', 'Claire', 'Nicola', 'Sarah', 'Laura', 'Katie', 'Emma', 'Rachel',
  'Louise', 'Catherine', 'Helen', 'Fiona', 'Gemma', 'Zoe', 'Amber', 'Lydia',
  'Martha', 'Beatrice', 'Clara', 'Molly', 'Niamh', 'Erin', 'Bethany',
];

export const UK_LAST_NAMES = [
  'Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Johnson', 'Davies',
  'Patel', 'Robinson', 'Wright', 'Thompson', 'Evans', 'Walker', 'White',
  'Roberts', 'Green', 'Hall', 'Wood', 'Jackson', 'Clarke', 'Harris', 'Martin',
  'Cooper', 'King', 'Watson', 'Baker', 'Harrison', 'Morgan', 'Allen', 'James',
  'Scott', 'Phillips', 'Moore', 'Ward', 'Turner', 'Carter', 'Mitchell', 'Lee',
  'Bennett', 'Parker', 'Edwards', 'Morris', 'Cook', 'Bell', 'Bailey', 'Young',
  'Hughes', 'Lewis', 'Hill', 'Adams', 'Cox', 'Richards', 'Miller', 'Campbell',
  'Kelly', 'Murray', 'Stewart', 'Reid', 'Gray', 'Anderson', 'Simpson', 'Ellis',
  'Mason', 'Chapman', 'Webb', 'Marshall', 'Collins', 'Palmer', 'Grant', 'Shaw',
  'Reynolds', 'Holmes', 'Hunt', 'Knight', 'Russell', 'Fox', 'Barnes', 'Fletcher',
];

export const UK_STREETS = [
  'High Street', 'Station Road', 'Victoria Road', 'Church Lane', 'London Road',
  'Kingsway', 'Queen Street', 'Park Avenue', 'Mill Lane', 'Green Lane',
  'New Road', 'Church Street', 'George Street', 'North Street', 'South Street',
  'West Street', 'Oxford Road', 'Cambridge Road', 'Windsor Avenue', 'Manor Road',
  'Grove Road', 'Bridge Street', 'Market Street', 'Castle Street', 'York Road',
  'Albert Road', 'Richmond Road', 'Clarence Street', 'St Johns Road', 'Elm Grove',
  'Oaklands Avenue', 'Wellington Road', 'Regent Street', 'Chapel Lane',
];

export const UK_CITIES: UkCitySpec[] = [
  { city: 'London', county: 'Greater London', outwardCodes: ['SW1A', 'E1', 'W1D', 'N1', 'SE1', 'NW1', 'EC2A', 'WC2N', 'SW3', 'W2'] },
  { city: 'Manchester', county: 'Greater Manchester', outwardCodes: ['M1', 'M2', 'M3', 'M4', 'M14', 'M15', 'M20'] },
  { city: 'Birmingham', county: 'West Midlands', outwardCodes: ['B1', 'B2', 'B3', 'B4', 'B5', 'B15', 'B16'] },
  { city: 'Leeds', county: 'West Yorkshire', outwardCodes: ['LS1', 'LS2', 'LS3', 'LS6', 'LS11'] },
  { city: 'Liverpool', county: 'Merseyside', outwardCodes: ['L1', 'L2', 'L3', 'L7', 'L15'] },
  { city: 'Bristol', county: 'Bristol', outwardCodes: ['BS1', 'BS2', 'BS8', 'BS6', 'BS3'] },
  { city: 'Sheffield', county: 'South Yorkshire', outwardCodes: ['S1', 'S2', 'S3', 'S10', 'S11'] },
  { city: 'Edinburgh', county: 'Midlothian', outwardCodes: ['EH1', 'EH2', 'EH3', 'EH8', 'EH10'] },
  { city: 'Glasgow', county: 'Lanarkshire', outwardCodes: ['G1', 'G2', 'G3', 'G12', 'G41'] },
  { city: 'Cardiff', county: 'South Glamorgan', outwardCodes: ['CF10', 'CF11', 'CF24', 'CF14'] },
  { city: 'Oxford', county: 'Oxfordshire', outwardCodes: ['OX1', 'OX2', 'OX3', 'OX4'] },
  { city: 'Cambridge', county: 'Cambridgeshire', outwardCodes: ['CB1', 'CB2', 'CB3', 'CB4'] },
  { city: 'Brighton', county: 'East Sussex', outwardCodes: ['BN1', 'BN2', 'BN3'] },
  { city: 'Newcastle upon Tyne', county: 'Tyne and Wear', outwardCodes: ['NE1', 'NE2', 'NE4', 'NE6'] },
  { city: 'Nottingham', county: 'Nottinghamshire', outwardCodes: ['NG1', 'NG2', 'NG7', 'NG9'] },
  { city: 'York', county: 'North Yorkshire', outwardCodes: ['YO1', 'YO10', 'YO24', 'YO31'] },
];

export const EUROPE_COUNTRIES: EuropeCountrySpec[] = [
  {
    code: 'DE',
    country: 'Germany',
    dialCode: '+49',
    mobilePrefixes: ['151', '152', '157', '160', '170', '171', '176', '179'],
    phoneDigitsAfterPrefix: 7,
    maleFirst: ['Lukas', 'Leon', 'Maximilian', 'Felix', 'Jonas', 'Paul', 'Tim', 'Julian', 'Moritz', 'Niklas', 'Tobias', 'Jan', 'Philipp', 'Florian', 'Stefan', 'Markus', 'Sebastian', 'Alexander', 'Matthias', 'Christian'],
    femaleFirst: ['Hannah', 'Mia', 'Emma', 'Sofia', 'Emilia', 'Lina', 'Anna', 'Lea', 'Marie', 'Laura', 'Lena', 'Julia', 'Sarah', 'Katharina', 'Johanna', 'Clara', 'Amelie', 'Nele', 'Lisa', 'Melanie'],
    lastNames: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Schäfer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schröder', 'Neumann', 'Schwarz', 'Zimmermann'],
    streets: ['Hauptstraße', 'Berliner Straße', 'Bahnhofstraße', 'Gartenstraße', 'Lindenstraße', 'Schillerstraße', 'Goethestraße', 'Friedrichstraße', 'Bergstraße', 'Mozartstraße', 'Kirchstraße', 'Waldstraße'],
    cities: [
      { city: 'Berlin', region: 'Berlin', postalPrefixes: ['10115', '10117', '10178', '10243', '10405', '10785'], postalDigits: 0 },
      { city: 'Munich', region: 'Bavaria', postalPrefixes: ['80331', '80333', '80469', '80539', '80636', '80802'], postalDigits: 0 },
      { city: 'Hamburg', region: 'Hamburg', postalPrefixes: ['20095', '20099', '20144', '20249', '20354', '22765'], postalDigits: 0 },
      { city: 'Frankfurt', region: 'Hesse', postalPrefixes: ['60311', '60313', '60322', '60486', '60594'], postalDigits: 0 },
      { city: 'Cologne', region: 'North Rhine-Westphalia', postalPrefixes: ['50667', '50670', '50674', '50823', '50931'], postalDigits: 0 },
    ],
    locale: 'de_DE',
  },
  {
    code: 'FR',
    country: 'France',
    dialCode: '+33',
    mobilePrefixes: ['6', '7'],
    phoneDigitsAfterPrefix: 8,
    maleFirst: ['Gabriel', 'Léo', 'Raphaël', 'Louis', 'Lucas', 'Adam', 'Arthur', 'Jules', 'Hugo', 'Maël', 'Nathan', 'Paul', 'Antoine', 'Thomas', 'Nicolas', 'Julien', 'Alexandre', 'Maxime', 'Clément', 'Romain'],
    femaleFirst: ['Jade', 'Louise', 'Ambre', 'Alba', 'Emma', 'Rose', 'Alice', 'Romy', 'Anna', 'Lina', 'Léa', 'Camille', 'Chloé', 'Manon', 'Inès', 'Sarah', 'Julie', 'Clara', 'Marine', 'Pauline'],
    lastNames: ['Martin', 'Bernard', 'Thomas', 'Petit', 'Robert', 'Richard', 'Durand', 'Dubois', 'Moreau', 'Laurent', 'Simon', 'Michel', 'Lefebvre', 'Leroy', 'Roux', 'David', 'Bertrand', 'Morel', 'Fournier', 'Girard'],
    streets: ['Rue de la République', 'Rue Victor Hugo', 'Avenue Jean Jaurès', 'Rue Pasteur', 'Rue Nationale', 'Boulevard Voltaire', 'Rue Gambetta', 'Avenue de la Gare', 'Rue Carnot', 'Rue des Lilas', 'Avenue Foch'],
    cities: [
      { city: 'Paris', region: 'Île-de-France', postalPrefixes: ['75001', '75004', '75007', '75011', '75015', '75016', '75017'], postalDigits: 0 },
      { city: 'Lyon', region: 'Auvergne-Rhône-Alpes', postalPrefixes: ['69001', '69002', '69003', '69006', '69007'], postalDigits: 0 },
      { city: 'Marseille', region: 'Provence-Alpes-Côte d’Azur', postalPrefixes: ['13001', '13002', '13006', '13008'], postalDigits: 0 },
      { city: 'Toulouse', region: 'Occitanie', postalPrefixes: ['31000', '31100', '31200', '31400'], postalDigits: 0 },
      { city: 'Bordeaux', region: 'Nouvelle-Aquitaine', postalPrefixes: ['33000', '33100', '33200', '33300'], postalDigits: 0 },
    ],
    locale: 'fr_FR',
  },
  {
    code: 'ES',
    country: 'Spain',
    dialCode: '+34',
    mobilePrefixes: ['6', '7'],
    phoneDigitsAfterPrefix: 8,
    maleFirst: ['Mateo', 'Martín', 'Lucas', 'Leo', 'Daniel', 'Alejandro', 'Manuel', 'Pablo', 'Álvaro', 'Adrián', 'David', 'Javier', 'Carlos', 'Diego', 'Sergio', 'Mario', 'Hugo', 'Marcos', 'Iker', 'Jorge'],
    femaleFirst: ['Lucía', 'Sofía', 'Martina', 'María', 'Julia', 'Paula', 'Valeria', 'Emma', 'Daniela', 'Carla', 'Alba', 'Sara', 'Carmen', 'Laura', 'Elena', 'Claudia', 'Marta', 'Irene', 'Andrea', 'Nerea'],
    lastNames: ['García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Muñoz', 'Álvarez', 'Romero', 'Alonso', 'Gutiérrez'],
    streets: ['Calle Mayor', 'Calle de Alcalá', 'Gran Vía', 'Avenida de la Constitución', 'Paseo de la Castellana', 'Calle Real', 'Calle Nueva', 'Avenida de Andalucía', 'Calle del Carmen', 'Calle San Juan'],
    cities: [
      { city: 'Madrid', region: 'Madrid', postalPrefixes: ['28001', '28004', '28010', '28013', '28015', '28020'], postalDigits: 0 },
      { city: 'Barcelona', region: 'Catalonia', postalPrefixes: ['08001', '08007', '08008', '08015', '08025'], postalDigits: 0 },
      { city: 'Valencia', region: 'Valencian Community', postalPrefixes: ['46001', '46004', '46005', '46010'], postalDigits: 0 },
      { city: 'Seville', region: 'Andalusia', postalPrefixes: ['41001', '41004', '41005', '41011'], postalDigits: 0 },
    ],
    locale: 'es_ES',
  },
  {
    code: 'IT',
    country: 'Italy',
    dialCode: '+39',
    mobilePrefixes: ['320', '328', '333', '335', '338', '340', '347', '348', '349', '392'],
    phoneDigitsAfterPrefix: 7,
    maleFirst: ['Leonardo', 'Francesco', 'Alessandro', 'Lorenzo', 'Mattia', 'Tommaso', 'Gabriele', 'Andrea', 'Riccardo', 'Edoardo', 'Matteo', 'Marco', 'Giuseppe', 'Luca', 'Davide', 'Simone', 'Federico', 'Antonio', 'Stefano', 'Giovanni'],
    femaleFirst: ['Sofia', 'Giulia', 'Aurora', 'Ginevra', 'Beatrice', 'Alice', 'Vittoria', 'Emma', 'Giorgia', 'Matilde', 'Chiara', 'Martina', 'Sara', 'Francesca', 'Elena', 'Federica', 'Valentina', 'Alessia', 'Camilla', 'Anna'],
    lastNames: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Mancini', 'Costa', 'Giordano', 'Rizzo', 'Lombardi', 'Moretti'],
    streets: ['Via Roma', 'Via Garibaldi', 'Corso Italia', 'Via Mazzini', 'Via Dante', 'Via Marconi', 'Corso Vittorio Emanuele', 'Via Verdi', 'Via Cavour', 'Via Milano', 'Via Torino'],
    cities: [
      { city: 'Rome', region: 'Lazio', postalPrefixes: ['00184', '00185', '00187', '00192', '00198'], postalDigits: 0 },
      { city: 'Milan', region: 'Lombardy', postalPrefixes: ['20121', '20122', '20124', '20135', '20144'], postalDigits: 0 },
      { city: 'Turin', region: 'Piedmont', postalPrefixes: ['10121', '10123', '10128', '10138'], postalDigits: 0 },
      { city: 'Naples', region: 'Campania', postalPrefixes: ['80121', '80122', '80132', '80134'], postalDigits: 0 },
      { city: 'Florence', region: 'Tuscany', postalPrefixes: ['50121', '50122', '50123', '50125'], postalDigits: 0 },
    ],
    locale: 'it_IT',
  },
  {
    code: 'NL',
    country: 'Netherlands',
    dialCode: '+31',
    mobilePrefixes: ['6'],
    phoneDigitsAfterPrefix: 8,
    maleFirst: ['Noah', 'Liam', 'Luca', 'Lucas', 'Mees', 'Finn', 'Sem', 'Levi', 'Milan', 'Daan', 'Bram', 'Jesse', 'Thijs', 'Thomas', 'Lars', 'Max', 'Tim', 'Sander', 'Jeroen', 'Pieter'],
    femaleFirst: ['Emma', 'Julia', 'Mila', 'Sophie', 'Olivia', 'Yara', 'Zoë', 'Nora', 'Tess', 'Sara', 'Lotte', 'Anna', 'Eva', 'Fleur', 'Lisa', 'Sanne', 'Anouk', 'Charlotte', 'Iris', 'Laura'],
    lastNames: ['De Jong', 'Jansen', 'De Vries', 'Van den Berg', 'Van Dijk', 'Bakker', 'Janssen', 'Visser', 'Smit', 'Meijer', 'De Boer', 'Mulder', 'De Groot', 'Bos', 'Vos', 'Peters', 'Hendriks', 'Van Leeuwen', 'Dekker', 'Brouwer'],
    streets: ['Kerkstraat', 'Dorpsstraat', 'Stationsstraat', 'Hoofdstraat', 'Nieuwstraat', 'Marktstraat', 'Schoolstraat', 'Julianalaan', 'Prins Hendrikstraat', 'Lindenlaan', 'Keizersgracht'],
    cities: [
      { city: 'Amsterdam', region: 'North Holland', postalPrefixes: ['1012 AB', '1015 CD', '1017 EF', '1053 GH', '1071 JK'], postalDigits: 0 },
      { city: 'Rotterdam', region: 'South Holland', postalPrefixes: ['3011 AA', '3012 BC', '3014 DE', '3021 FG'], postalDigits: 0 },
      { city: 'Utrecht', region: 'Utrecht', postalPrefixes: ['3511 AB', '3512 CD', '3521 EF', '3581 GH'], postalDigits: 0 },
      { city: 'The Hague', region: 'South Holland', postalPrefixes: ['2511 AA', '2514 BC', '2517 DE', '2585 FG'], postalDigits: 0 },
    ],
    locale: 'nl_NL',
  },
  {
    code: 'PL',
    country: 'Poland',
    dialCode: '+48',
    mobilePrefixes: ['50', '51', '53', '57', '60', '66', '69', '72', '73', '78', '79', '88'],
    phoneDigitsAfterPrefix: 7,
    maleFirst: ['Antoni', 'Jan', 'Aleksander', 'Nikodem', 'Franciszek', 'Jakub', 'Leon', 'Mikołaj', 'Stanisław', 'Filip', 'Piotr', 'Kacper', 'Mateusz', 'Michał', 'Tomasz', 'Paweł', 'Łukasz', 'Krzysztof', 'Adam', 'Marcin'],
    femaleFirst: ['Zofia', 'Zuzanna', 'Hanna', 'Maja', 'Laura', 'Julia', 'Oliwia', 'Alicja', 'Pola', 'Lena', 'Maria', 'Emilia', 'Wiktoria', 'Amelia', 'Natalia', 'Karolina', 'Aleksandra', 'Katarzyna', 'Anna', 'Magdalena'],
    lastNames: ['Nowak', 'Kowalski', 'Wiśniewski', 'Wójcik', 'Kowalczyk', 'Kamiński', 'Lewandowski', 'Zieliński', 'Szymański', 'Woźniak', 'Dąbrowski', 'Kozłowski', 'Jankowski', 'Mazur', 'Kwiatkowski', 'Krawczyk', 'Piotrowski', 'Grabowski', 'Nowakowski', 'Pawłowski'],
    streets: ['ul. Marszałkowska', 'ul. Mickiewicza', 'ul. Sienkiewicza', 'ul. Kościuszki', 'ul. Polna', 'ul. Słoneczna', 'ul. Leśna', 'ul. Krótka', 'ul. Szkolna', 'ul. Ogrodowa', 'ul. Długa'],
    cities: [
      { city: 'Warsaw', region: 'Masovian', postalPrefixes: ['00-001', '00-120', '01-510', '02-595', '03-719'], postalDigits: 0 },
      { city: 'Kraków', region: 'Lesser Poland', postalPrefixes: ['30-001', '31-010', '31-150', '30-509'], postalDigits: 0 },
      { city: 'Wrocław', region: 'Lower Silesian', postalPrefixes: ['50-001', '50-101', '53-110', '54-202'], postalDigits: 0 },
      { city: 'Gdańsk', region: 'Pomeranian', postalPrefixes: ['80-001', '80-254', '80-388', '80-835'], postalDigits: 0 },
    ],
    locale: 'en_GB',
  },
  {
    code: 'SE',
    country: 'Sweden',
    dialCode: '+46',
    mobilePrefixes: ['70', '72', '73', '76', '79'],
    phoneDigitsAfterPrefix: 7,
    maleFirst: ['Noah', 'William', 'Liam', 'Hugo', 'Lucas', 'Adam', 'Oliver', 'Matteo', 'Elias', 'Oscar', 'Erik', 'Lars', 'Karl', 'Anders', 'Johan', 'Per', 'Nils', 'Henrik', 'Gustav', 'Viktor'],
    femaleFirst: ['Alma', 'Alice', 'Olivia', 'Elsa', 'Astrid', 'Maja', 'Freja', 'Vera', 'Selma', 'Saga', 'Ella', 'Ebba', 'Wilma', 'Klara', 'Sofia', 'Emma', 'Anna', 'Karin', 'Maria', 'Linnea'],
    lastNames: ['Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson', 'Svensson', 'Gustafsson', 'Pettersson', 'Jonsson', 'Jansson', 'Hansson', 'Bengtsson', 'Carlsson', 'Lindqvist', 'Lindberg', 'Magnusson', 'Bergström'],
    streets: ['Storgatan', 'Kungsgatan', 'Drottninggatan', 'Sveavägen', 'Vasagatan', 'Kyrkogatan', 'Skolgatan', 'Parkgatan', 'Strandvägen', 'Linnégatan', 'Odengatan'],
    cities: [
      { city: 'Stockholm', region: 'Stockholm', postalPrefixes: ['111 22', '112 34', '113 55', '114 45', '116 30'], postalDigits: 0 },
      { city: 'Gothenburg', region: 'Västra Götaland', postalPrefixes: ['411 04', '411 18', '412 58', '413 08'], postalDigits: 0 },
      { city: 'Malmö', region: 'Skåne', postalPrefixes: ['211 18', '211 43', '214 21', '217 48'], postalDigits: 0 },
    ],
    locale: 'en_GB',
  },
  {
    code: 'IE',
    country: 'Ireland',
    dialCode: '+353',
    mobilePrefixes: ['83', '85', '86', '87', '89'],
    phoneDigitsAfterPrefix: 7,
    maleFirst: ['Jack', 'Noah', 'James', 'Rían', 'Charlie', 'Oisín', 'Tadhg', 'Liam', 'Cillian', 'Daniel', 'Conor', 'Sean', 'Patrick', 'Michael', 'David', 'Eoin', 'Ciaran', 'Brendan', 'Declan', 'Ronan'],
    femaleFirst: ['Grace', 'Fiadh', 'Emily', 'Sophie', 'Éabha', 'Hannah', 'Mia', 'Ava', 'Lily', 'Ella', 'Aoife', 'Saoirse', 'Niamh', 'Ciara', 'Orla', 'Sinead', 'Rachel', 'Sarah', 'Claire', 'Emma'],
    lastNames: ['Murphy', 'Kelly', 'O’Sullivan', 'Walsh', 'Smith', 'O’Brien', 'Byrne', 'Ryan', 'O’Connor', 'O’Neill', 'Reilly', 'Doyle', 'McCarthy', 'Gallagher', 'O’Doherty', 'Kennedy', 'Lynch', 'Murray', 'Quinn', 'Moore'],
    streets: ['O’Connell Street', 'Grafton Street', 'Henry Street', 'Dame Street', 'Baggot Street', 'Main Street', 'Patrick Street', 'Shop Street', 'Pearse Street', 'Camden Street'],
    cities: [
      { city: 'Dublin', region: 'Leinster', postalPrefixes: ['D01 F5P2', 'D02 X285', 'D04 V2P6', 'D06 K6Y8', 'D08 W8X2'], postalDigits: 0 },
      { city: 'Cork', region: 'Munster', postalPrefixes: ['T12 C825', 'T12 R294', 'T23 YX64'], postalDigits: 0 },
      { city: 'Galway', region: 'Connacht', postalPrefixes: ['H91 E9X4', 'H91 K5N8', 'H91 W29T'], postalDigits: 0 },
    ],
    locale: 'en_GB',
  },
];
