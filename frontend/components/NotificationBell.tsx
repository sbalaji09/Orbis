"use client";

import {useState, useEffect, useRef} from "react";
import {useAuth} from "@/hooks/useAuth";
import { fetchCostAnomalies, acknowledgeAnomaly, acknowledgeAllAnomalies, CostAnomaly} from "@/lib/cost-api-client";
import {Bell} from "lucide-react";