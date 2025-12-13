import { useEffect, useState, useRef, useCallback } from "react";
import useSWR from "swr";
import {Span} from '../lib/types';
import {useWebSocket} from '../lib/useWebSocket';
import {SpanCreatedMessage} from '../lib/types';

interface UseRealtimeTraceResult {
    spans: Span[];
    isConnected: boolean;
    error: Error | null;
    isLoading: boolean;
}

interface UseRealtimeTraceParams {
    traceId: string;
    apiKey: string;
    initialSpans?: Span[];
}