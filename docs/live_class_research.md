# Investigación de Aulas Virtuales para IAVolution

El usuario necesita una solución integrada en la academia para clases síncronas que soporte:
1. Audio y Video en tiempo real.
2. Compartir pantalla.
3. Compartir documentos (PDFs, presentaciones).
4. Grabación de la clase.
5. Acceso restringido a los alumnos matriculados en ese grupo/curso.

## Enfoques Técnicos

### 1. Desarrollo Custom con WebRTC (Mediasoup / LiveKit / Jitsi)
*   **Pros:** Control total sobre la UI y los datos. Sin coste por licencia (solo infraestructura).
*   **Contras:** Extremadamente complejo de implementar y mantener. Requiere servidores dedicados potentes (SFU/MCU) para manejar múltiples conexiones de video concurrentes. La grabación en la nube es un reto técnico enorme (necesita grabar streams compuestos).
*   **Viabilidad para IAVolution:** Baja-Media. El esfuerzo de desarrollo desviaría el foco del producto principal.

### 2. Integración mediante API/iFrame de terceros
Soluciones "Platform as a Service" (PaaS) diseñadas para embeber videoconferencias.

#### a) Jitsi Meet (Open Source / 8x8 JaaS)
*   Tiene un componente React (`@jitsi/react-sdk`) facilísimo de integrar.
*   Permite crear salas al vuelo y asegurarlas con JWT atados a la base de datos de Supabase.
*   Soporte nativo para compartir pantalla y levantar la mano.
*   La grabación está disponible si se usa su servicio JaaS (de pago) o configurando Jibri en un servidor propio (complejo).

#### b) Daily.co
*   API y SDKs muy robustos y modernos para React.
*   Permite llamadas customizadas o usar su UI preconstruida "Daily Prebuilt".
*   Tiene APIs para grabar en la nube, control de roles (owner vs viewer).
*   Capa gratuita generosa, pero la grabación en la nube es de pago por minuto.

#### c) Zoom Video SDK
*   El estándar de la industria.
*   Alta calidad, pero la integración del SDK es notoria por ser más áspera y compleja.
*   La grabación requiere cuentas pro.

### 3. Solución Híbrida "Low Code" (Integración con herramientas existentes)
En lugar de construir el aula de cero *dentro* de la app, actuar como un orquestador:
*   Crear reuniones de **Google Meet** o **Zoom** vía API al programar la clase.
*   La app IAVolution solo muestra el botón de "Unirse a la clase en vivo", que lleva a la plataforma externa.
*   El profesor graba mediante Zoom/Meet y luego sube el enlace del vídeo como un "Material" más al curso.
*   **Pros:** Cero mantenimiento de infraestructura de vídeo. Las herramientas son familiares y estables. Grabación nativa solucionada.
*   **Contras:** La experiencia sale de la plataforma web en el momento de la clase.

## Conclusión y Recomendación

Dada la etapa de desarrollo y la complejidad de mantener servidores de vídeo:

La **Opción 3** (Integración asíncrona Zoom/Meet) es la más rápida para salir al mercado. Se desarrolla en 1-2 días.
La **Opción 2a o 2b** (Jitsi o Daily.co) es la mejor si el requisito de "todo embebido en la app" es estricto e innegociable. Requiere crear una UI de "Live Room" e integrar tokens. Se desarrolla en ~1 semana.
La **Opción 1** (Custom WebRTC) debe ser descartada por ahora por su alto coste técnico de mantenimiento.
