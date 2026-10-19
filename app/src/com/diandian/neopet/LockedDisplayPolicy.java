// Adapted from backscreen-toolbox v1.1.0; Copyright (c) 2026 STEPX Advance contributors. MIT.
package com.diandian.neopet;

/** Eligibility for a bounded CPU hold; it never turns on the main display. */
public final class LockedDisplayPolicy {
    public static boolean rearVisible(int posture){return posture==1||posture==2;}
    private LockedDisplayPolicy(){}
    public static boolean keepCpu(boolean active,boolean interactive,boolean rearUp,boolean featureEnabled,
                                  boolean needsUpdates,boolean powerSave,int thermalStatus) {
        return active&&!interactive&&rearUp&&featureEnabled&&needsUpdates&&!powerSave&&thermalStatus<3;
    }
}
