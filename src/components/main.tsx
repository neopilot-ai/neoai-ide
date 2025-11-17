"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchMRDetails } from '@/app/lib/actions/mr_analysis/actions';
import { useSession } from "next-auth/react";
import { ReviewType } from './reviewer_prompts';
import { MRAnalysis } from './mr_details';
import Login from './login';
import { Issue } from '@/app/lib/actions/common/entities/issue';
import IssueBreakdownTool from './issue_breakdown';
import Navbar from './navbar';
import Chat from './chat';
import SettingsPopup from './settings_popup';
import SearchLayout from './search_widget';
import { fetchIssue } from '@/app/lib/actions/issues/actions';
import { Epic } from '@/app/lib/actions/common/entities/epic';
import EpicView from './epic_view';
import { fetchEpic } from '@/app/lib/actions/epic/actions';
import { addToCache, getItemWithExpiry } from '@/app/lib/utils';
import CacheBanner from './cache_banner';
import { MergeRequest } from '@/app/lib/actions/common/entities/merge_request';
import { InsightsBlob } from '@/app/lib/actions/common/entities/blob';
import { fetchBlob } from '@/app/lib/actions/blob/actions';
import BlobView from './blob_view';

export default function Main() {
  const [mrData, setMrData] = useState<MergeRequest | null>(null);
  const [issue, setIssue] = useState<Issue | null>(null);
  const [epic, setEpic] = useState<Epic | null>(null);
  const [blob, setBlob] = useState<InsightsBlob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewType, setReviewType] = useState<ReviewType>('General');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isResponseFromCache, setIsResponseFromCache] = useState(false);
  const [isRefreshingCache, setIsRefreshingCache] = useState(false);
  const [lastAnalysedURL, setLastAnalysedURL] = useState<string>("");

  const { data: session, status } = useSession();
  const searchParams = useSearchParams();

  const fetchData = useCallback(async (url: string) => {
    try {
      setIsRefreshingCache(true);

      if (url.indexOf("merge_requests") > -1) {
        const customPromptCodeComments = localStorage.getItem('customPromptCodeComments');
        const mrResponse = await fetchMRDetails(url, reviewType, customPromptCodeComments);
        console.log('Merge Request', mrResponse);
        addToCache(url, mrResponse);
        setMrData(mrResponse);
        setIssue(null);
        setEpic(null);
        setBlob(null);
      } else if (url.indexOf("issues") > -1) {
        const fetchedIssue = await fetchIssue(url);
        console.log('Issue', fetchedIssue);
        addToCache(url, fetchedIssue);
        setIssue(fetchedIssue);
        setMrData(null);
        setEpic(null);
        setBlob(null);
      } else if (url.indexOf("epic") > -1) {
        const fetchedEpic = await fetchEpic(url);
        console.log('Epic', fetchedEpic);
        addToCache(url, fetchedEpic);
        setIssue(null);
        setMrData(null);
        setEpic(fetchedEpic);
        setBlob(null);
      } else if (url.indexOf("blob") > -1) {
        const fetchedBlob = await fetchBlob(url);
        console.log('Blob', fetchedBlob);
        addToCache(url, fetchedBlob);
        setIssue(null);
        setMrData(null);
        setEpic(null);
        setBlob(fetchedBlob);
      } else {
        setError("URL type not supported at the moment. Please raise a feature request if you would like to analyse URL like these.");  
      }
    } catch (err: unknown) {
      setError((err as {message: string}).message);
      console.error(err);
    } finally {
      setIsRefreshingCache(false);
      setIsResponseFromCache(false);
    }
  }, [reviewType]);

  const handleSubmit = useCallback(async (url: string) => {
    setError(null);
    setMrData(null);
    setIssue(null);
    setEpic(null);
    setBlob(null);
    setLastAnalysedURL(url);
    setIsRefreshingCache(false);

    // Check if the URL exists in cache and return it if it does
    const cachedData = getItemWithExpiry(url);
    if (cachedData) {
      setIsResponseFromCache(true);
      if (url.indexOf("merge_requests") > -1) {
        setMrData(cachedData as MergeRequest);
      } else if (url.indexOf("epics") > -1) {
        setEpic(cachedData as Epic);
      } else if (url.indexOf("issues") > -1) {
        setIssue(cachedData as Issue);
      } else if (url.indexOf("blob") > -1) {
        setBlob(cachedData as InsightsBlob);
      }
      return;
    }

    await fetchData(url); 
  }, [fetchData]);

  useEffect(() => {
    const urlParam = searchParams.get('url');
    if (urlParam) {
      handleSubmit(urlParam);
    }
  }, [searchParams, handleSubmit]);

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <Login />;
  }

  return (
    <div>
      <Chat mrDetails={mrData} issue={issue} epic={epic} blob={blob} />

      {isSettingsOpen && <SettingsPopup onClose={() => setIsSettingsOpen(false)} />}
      <Navbar onSettingsClick={() => setIsSettingsOpen(true)} />
      <div className="w-full py-8 px-4">
        <SearchLayout 
          onSubmit={handleSubmit}
          hasResults={!!mrData || !!issue || !!epic || !!blob}
          reviewType={reviewType}
          setReviewType={setReviewType}
          defaultUrl={searchParams.get('url') || ''}
        />

        {error && (
          <div className="text-red-600 mb-4">
            {error}
          </div>
        )}

        {isResponseFromCache && (
          <CacheBanner 
            isRefreshing={isRefreshingCache} 
            handleRefresh={async () => {
              setError(null);
              await fetchData(lastAnalysedURL || "");
            }} 
          />
        )}

        {mrData && <MRAnalysis mrData={mrData} />}
        {issue && <IssueBreakdownTool issue={issue} setError={setError} />}
        {epic && <EpicView epicData={epic} />}
        {blob && <BlobView blob={blob} />}
      </div>
    </div>
  );
}
