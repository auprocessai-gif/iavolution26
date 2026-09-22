import fs from 'fs';
import path from 'path';

const students = [
  { no: 1, name: "Jeniffer Vanesa Salguero García", email: "jeniffersalgueroz21@gmail.com", profession: "Lic. Economía Internacional", company: "Banco Integral S.A", role: "Analista de riesgos financieros", phone: "7752-6948", pass: "IAV2026*6948" },
  { no: 2, name: "Sergio Ivan Perez Delgado", email: "perezsergioivan@gmail.com", profession: "Ingeniero Agronomo", company: "Corporacion ILP", role: "Gerente", phone: "7859-4608", pass: "IAV2026*4608" },
  { no: 3, name: "Erick Rafael Aguilar Puente", email: "ingeniero.erickaguilar@gmail.com", profession: "Ingeniero de Sistemas Informaticas", company: "Colegio Evangélico Misión Centroamericana", role: "Docente en Informática", phone: "7743-8925", pass: "IAV2026*8925" },
  { no: 4, name: "José Humberto Estrada", email: "correo.estrada.personal@gmail.com", profession: "Lic. Informatica", company: "Grupo Don Chico", role: "Propietario", phone: "7856 6446", pass: "IAV2026*6446" },
  { no: 5, name: "Ronald Giovanny Cardona Valdez", email: "rgcvaldez@gmail.com", profession: "Lic. Contaduría Publica", company: "ACAIS DE R.L.", role: "Gerente General", phone: "7785-0468", pass: "IAV2026*0468" },
  { no: 6, name: "Irvin Osmanio Cuellar Escobar", email: "escollar23@gmail.com", profession: "Lic. Contaduría Publica", company: "Sociedad Cooperativa Sacerdotal", role: "Gerente General", phone: "7851-9763", pass: "IAV2026*9763" },
  { no: 7, name: "Medardo Melquisidec Ruano Martinez", email: "melquiruano@gmail.com", profession: "Lic. Contaduría Publica", company: "RG Consultores", role: "Consultor", phone: "7020-0898", pass: "IAV2026*0898" },
  { no: 8, name: "Alison Vanessa Córdova Olivia", email: "avco1408@outlook.com", profession: "Lic. Idioma Ingles", company: "Foundever", role: "Supervisora en atención al servicio al cliente", phone: "7589 4063", pass: "IAV2026*4063" },
  { no: 9, name: "Karen Lisseth Aguirre Joachin", email: "karen_298@msn.com", profession: "Ing. Industrial", company: "Celeritas Manufacturing", role: "Jefe de procesamiento de órdenes", phone: "7100 1624", pass: "IAV2026*1624" },
  { no: 10, name: "Julio Salvador Artiga Gil", email: "julioartiga@bufeteartigagil.com", profession: "Lic. Ciencias Jurídicas", company: "Bufete Artiga Gil", role: "Socio Fundador", phone: "6180-4117", pass: "IAV2026*4117" },
  { no: 11, name: "Ricardo Ernesto Orellana López", email: "rcorellana.1999@gmail.com", profession: "Lic. Contaduría Publica", company: "Macrorent de El Salvador S.A. de C.V", role: "Analista Senior de Contabilidad e impuestos", phone: "7399 2593", pass: "IAV2026*2593" },
  { no: 12, name: "Felix Armando Perez Guadron", email: "felix.perez@almaconsa.com.sv", profession: "Ing. Industrial", company: "Almaconsa S.A DE C.V.", role: "Gerente de Operaciones", phone: "7855-7347", pass: "IAV2026*7347" },
  { no: 13, name: "Dagoberto Zelaya", email: "dagoberto.zelaya@almaconsa.com.sv", profession: "Lic. Contaduría Publica", company: "Almaconsa S.A DE C.V.", role: "Sub Gerente General", phone: "7852-7558", pass: "IAV2026*7558" },
  { no: 14, name: "Carlos Antonio Cerón Amaya", email: "carlos.ceron@almaconsa.com.sv", profession: "N/A", company: "Almaconsa S.A DE C.V.", role: "Jefe de operaciones", phone: "6311-9040", pass: "IAV2026*9040" },
  { no: 15, name: "Maria Gabriela Molina Morales", email: "gabymolina_2010@hotmail.com", profession: "Lic. Economía Internacional", company: "Banco Central de Reserva de El Salvador", role: "Senior de plataformas digitales de Comercio Exterior", phone: "7502 4218", pass: "IAV2026*4218" },
  { no: 16, name: "Marvin Rodrigo Vásquez Ramírez", email: "marvin.mvasquez@outlook.com", profession: "N/A", company: "N/A", role: "N/A", phone: "7748 0334", pass: "IAV2026*0334" },
  { no: 17, name: "Arthur Roberto Dueñas Alcántara", email: "arthurduenas72@gmail.com", profession: "Ing. Industrial", company: "Gobierno de El Salvador", role: "Analista de procesos y transformación digital", phone: "7111-9884", pass: "IAV2026*9884" },
  { no: 18, name: "Guillermo Alex Hernandez Díaz", email: "gernandez77@hotmail.com", profession: "Lic. Contaduría Publica", company: "N/A", role: "N/A", phone: "6260-3130", pass: "IAV2026*3130" },
  { no: 19, name: "Mario Arturo Hernández Barrera", email: "mahbarrera@gmail.com", profession: "Ing. Industrial", company: "Be Organic", role: "Gerente de Operaciones", phone: "6170 1369", pass: "IAV2026*1369" },
  { no: 20, name: "Beatriz Elena Ibarra Aguirre", email: "elenaibarra1545@gmail.com", profession: "N/A", company: "N/A", role: "N/A", phone: "7850 4097", pass: "IAV2026*4097" },
  { no: 21, name: "Eduardo Wilfredo Ortiz Molina", email: "gestionempresarial@acoyec.com", profession: "N/A", company: "N/A", role: "N/A", phone: "7479 2149", pass: "IAV2026*2149" },
  { no: 22, name: "Erika Valentina Mejia Lopez", email: "erikavalentinamejia@gmail.com", profession: "Lic. Contaduría Publica", company: "N/A", role: "N/A", phone: "7621-9451", pass: "IAV2026*9451" },
  { no: 23, name: "Lucia Emperatriz Hernández Romero", email: "luemheme@gmail.com", profession: "Lic. Economía y Negocios", company: "Servicios Generales Bursátiles S.A de C.V.", role: "Gerente de Mercadeo y ventas", phone: "7187-3020", pass: "IAV2026*3020" }
];

const courseTitle = "Diplomado en Automatización de Procesos con IA";
const editionName = "Septiembre 2026";
const courseId = "175d879d-08a8-4c64-85e0-47ad97f5e1e8";
const editionId = "9725e5d4-58d9-4e3c-9b6a-1c2c4cccda2c";
const studentRoleId = "b8fe19b8-2ad0-4131-8f61-5e5677b8d57e";
const campusUrl = "https://iavolution.academy";

// 1. GENERATE SQL SCRIPT
let sql = `-- ==============================================================================
-- ALTA MASIVA Y MATRICULACIÓN DE ALUMNOS (EDICIÓN SEPTIEMBRE 2026)
-- Diplomado en Automatización de Procesos con IA
-- ==============================================================================

DO $$
DECLARE
    v_user_id UUID;
    v_course_id UUID := '${courseId}';
    v_edition_id UUID := '${editionId}';
    v_role_id UUID := '${studentRoleId}';
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT * FROM (VALUES\n`;

const valuesSql = students.map((s, idx) => {
  const isLast = idx === students.length - 1;
  const cleanName = s.name.replace(/'/g, "''");
  const cleanEmail = s.email.trim().toLowerCase().replace(/'/g, "''");
  return `            ('${cleanName}', '${cleanEmail}', '${s.pass}')${isLast ? '' : ','}`;
}).join('\n');

sql += valuesSql;
sql += `\n        ) AS t(name, email, pass)
    LOOP
        -- 1. Buscar si ya existe en auth.users
        SELECT id INTO v_user_id FROM auth.users WHERE email = lower(trim(rec.email));

        IF v_user_id IS NULL THEN
            v_user_id := gen_random_uuid();
            
            INSERT INTO auth.users (
                instance_id,
                id,
                aud,
                role,
                email,
                encrypted_password,
                email_confirmed_at,
                raw_app_meta_data,
                raw_user_meta_data,
                created_at,
                updated_at
            ) VALUES (
                '00000000-0000-0000-0000-000000000000',
                v_user_id,
                'authenticated',
                'authenticated',
                lower(trim(rec.email)),
                crypt(rec.pass, gen_salt('bf')),
                NOW(),
                '{"provider":"email","providers":["email"]}'::jsonb,
                json_build_object('name', rec.name, 'role', 'student', 'app', 'iavolution')::jsonb,
                NOW(),
                NOW()
            );
        ELSE
            -- Si ya existía, actualizamos su contraseña para que pueda entrar con la clave asignada
            UPDATE auth.users 
            SET encrypted_password = crypt(rec.pass, gen_salt('bf')),
                email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
                updated_at = NOW()
            WHERE id = v_user_id;
        END IF;

        -- 2. Asegurar registro en iavolution.profiles
        INSERT INTO iavolution.profiles (id, email, name, role_id, status, app)
        VALUES (
            v_user_id,
            lower(trim(rec.email)),
            rec.name,
            v_role_id,
            'active',
            'iavolution'
        )
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            role_id = v_role_id,
            status = 'active',
            app = 'iavolution';

        -- 3. Matricular en el Diplomado y en la Edición Septiembre 2026
        INSERT INTO iavolution.enrollments (user_id, course_id, edition_id)
        VALUES (
            v_user_id,
            v_course_id,
            v_edition_id
        )
        ON CONFLICT (user_id, edition_id) DO NOTHING;

    END LOOP;
END $$;

-- Recargar caché de PostgREST
NOTIFY pgrst, 'reload schema';

-- Comprobación final de matriculados en Septiembre 2026
SELECT 
    p.name AS "Alumno",
    p.email AS "Correo",
    e.created_at AS "Fecha Matricula",
    ce.name AS "Edicion"
FROM iavolution.enrollments e
JOIN iavolution.profiles p ON e.user_id = p.id
JOIN iavolution.course_editions ce ON e.edition_id = ce.id
WHERE e.edition_id = '${editionId}'
ORDER BY p.name ASC;
`;

const docsSqlPath = path.resolve('c:/Users/Mario/Documents/iavolution/docs/alta_alumnos_septiembre_2026.sql');
fs.writeFileSync(docsSqlPath, sql, 'utf8');
console.log('SQL generado en:', docsSqlPath);

// 2. GENERATE CSV WITH UTF-8 BOM FOR EXCEL
const csvHeaders = ["No", "Nombre Completo", "Correo (Usuario)", "Contraseña Temporal", "Celular", "Profesion", "Empresa", "Cargo", "Diplomado", "Edicion", "Enlace Acceso"];

const csvRows = students.map(s => {
  return [
    s.no,
    `"${s.name}"`,
    `"${s.email}"`,
    `"${s.pass}"`,
    `"${s.phone}"`,
    `"${s.profession}"`,
    `"${s.company}"`,
    `"${s.role}"`,
    `"${courseTitle}"`,
    `"${editionName}"`,
    `"${campusUrl}"`
  ].join(';');
});

const bom = '\uFEFF';
const csvContent = bom + csvHeaders.join(';') + '\n' + csvRows.join('\n');
const csvPath = path.resolve('c:/Users/Mario/Documents/iavolution/Alumnos_Diplomado_Septiembre_2026.csv');
fs.writeFileSync(csvPath, csvContent, 'utf8');
console.log('CSV para Excel generado en:', csvPath);

// 3. TRY GENERATING NATIVE XLSX IF PACKAGE EXISTS
try {
  const xlsx = await import('xlsx');
  const wsData = [
    csvHeaders,
    ...students.map(s => [
      s.no,
      s.name,
      s.email,
      s.pass,
      s.phone,
      s.profession,
      s.company,
      s.role,
      courseTitle,
      editionName,
      campusUrl
    ])
  ];
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.aoa_to_sheet(wsData);
  xlsx.utils.book_append_sheet(wb, ws, "Septiembre 2026");
  const xlsxPath = path.resolve('c:/Users/Mario/Documents/iavolution/Alumnos_Diplomado_Septiembre_2026.xlsx');
  xlsx.writeFile(wb, xlsxPath);
  console.log('XLSX generado en:', xlsxPath);
} catch (e) {
  console.log('XLSX no se pudo generar directamente, CSV con BOM disponible:', e.message);
}
