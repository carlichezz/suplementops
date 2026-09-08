import React from 'react';

export default function ProductCardSkeleton() {
  return (
    <div className="card bg-base-100 shadow-md overflow-hidden rounded-[14px]" aria-hidden="true">
      <div className="relative aspect-[4/3] bg-base-100 mt-2">
        <div className="skeleton rounded-xl" />
      </div>
      <div className="card-body p-3.5 gap-1.5">
        <div className="flex flex-col gap-1 min-h-[2.94rem]">
          <div className="skeleton h-[1.47rem] w-full rounded" />
          <div className="skeleton h-[1.47rem] w-2/3 rounded" />
        </div>
        <div className="flex flex-col -mt-0.5 gap-1">
          <div className="skeleton h-[1.23rem] w-full rounded" />
          <div className="skeleton h-[1.23rem] w-5/6 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="skeleton h-[1.5rem] w-20 rounded" />
          <div className="skeleton h-[1.23rem] w-12 rounded" />
        </div>
        <div className="skeleton mt-auto h-[2rem] w-24 rounded" />
        <div className="skeleton h-[1.5rem] w-24 rounded" />
      </div>
      <div className="flex flex-col gap-2 px-3.5 pb-3.5">
        <div className="skeleton h-8 w-full rounded" />
        <div className="skeleton h-8 w-full rounded" />
      </div>
    </div>
  );
}