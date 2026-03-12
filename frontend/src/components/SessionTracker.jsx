import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSessionTracking } from '../hooks/useSessionTracking';

/**
 * Invisible component that handles global session tracking
 */
const SessionTracker = () => {
    const { user } = useAuth();

    // Call the tracking hook
    useSessionTracking(user);

    return null; // This component doesn't render anything
};

export default SessionTracker;
