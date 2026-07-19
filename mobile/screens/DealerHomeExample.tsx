/**
 * AUTOVERSE — Example: wiring SellScreen output into DealerDashboardScreen
 *
 * This isn't a screen itself — it's a reference for how a navigation
 * container should connect the two. Adapt the presentation logic
 * (modal vs. stack push) to your actual navigation library.
 */

import React, { useRef, useState } from 'react';
import DealerDashboardScreen, { DealerDashboardHandle } from './DealerDashboardScreen';
import SellScreen from './SellScreen';
import { ListingDraft } from '../types/listing.types';
import { DealerListingItem } from '../types/dealer.types';

function toDealerListingItem(listing: ListingDraft): DealerListingItem {
  return {
    vehicleId: listing.vehicleId,
    make: listing.make || '',
    model: listing.model || '',
    year: listing.year || 0,
    mileageKm: listing.mileageKm || 0,
    priceNGN: listing.priceNGN || 0,
    status: listing.status,
    primaryImageUrl: listing.photos.find((p) => p.isCover)?.url || null,
    autoInspectScore: null, // filled in by the reconciling refresh — see prependListing
    autoInspectGrade: null,
    views30d: 0,
    inquiries30d: 0,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
  };
}

export default function DealerHomeExample({ dealerId }: { dealerId: string }) {
  const dashboardRef = useRef<DealerDashboardHandle>(null);
  const [showSellFlow, setShowSellFlow] = useState(false);

  if (showSellFlow) {
    return (
      <SellScreen
        onCancel={() => setShowSellFlow(false)}
        onPublished={(listing) => {
          setShowSellFlow(false);
          // Instantly show the new listing, then reconcile with the
          // server (which will fill in the AutoInspect score/grade
          // and correct view/inquiry counts).
          dashboardRef.current?.prependListing(toDealerListingItem(listing));
        }}
      />
    );
  }

  return (
    <DealerDashboardScreen
      ref={dashboardRef}
      dealerId={dealerId}
      onAddListing={() => setShowSellFlow(true)}
      onOpenListing={(vehicleId) => {
        // navigate to listing detail
      }}
    />
  );
}
