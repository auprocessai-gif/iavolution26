import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useLocation, useParams } from 'react-router-dom';

/**
 * Hook to track user session time via heartbeats.
 * Sends a ping every 60 seconds to iavolution.user_sessions
 */
export const useSessionTracking = (user) => {
    const location = useLocation();
    const { id: courseId } = useParams();
    const sessionRef = useRef(null);
    const intervalRef = useRef(null);

    useEffect(() => {
        if (!user) return;

        // Manually parse courseId from URL since useParams() is often empty at App root
        const courseMatch = location.pathname.match(/\/courses\/([^\/]+)/);
        const currentCourseId = courseMatch ? courseMatch[1] : null;

        const startSession = async () => {
            try {
                console.log('Session tracking started for user:', user.id, 'course:', currentCourseId);
                const { data, error } = await supabase
                    .schema('iavolution')
                    .from('user_sessions')
                    .insert([{
                        user_id: user.id,
                        course_id: currentCourseId,
                        start_time: new Date().toISOString(),
                        last_ping: new Date().toISOString(),
                        total_minutes: 1
                    }])
                    .select()
                    .single();

                if (error) {
                    console.warn('Session tracking insert error:', error.message);
                    return;
                }
                sessionRef.current = data.id;
            } catch (err) {
                console.warn('Error starting tracking session:', err);
            }
        };

        const sendHeartbeat = async () => {
            if (!sessionRef.current) return;

            try {
                // Use the public schema wrapper function
                const { error } = await supabase.rpc('increment_minutes', { row_id: sessionRef.current });
                if (error) {
                    console.warn('Heartbeat RPC error:', error.message);
                } else {
                    console.log('Heartbeat sent successfully for session:', sessionRef.current);
                }
            } catch (err) {
                console.warn('Heartbeat error:', err);
            }
        };

        startSession();

        // Ping every minute
        intervalRef.current = setInterval(sendHeartbeat, 60000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [user?.id, location.pathname]);
};

