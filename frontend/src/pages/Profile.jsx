import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { formatDate } from '../utils/formatDate';

export default function Profile() {
  const { user } = useAuth();
  const [userDoc, setUserDoc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(false);

  function toDate(value) {
    try {
      if (!value) return null;
      if (typeof value.toDate === 'function') return value.toDate();
      if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    } catch (_) {
      return null;
    }
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user || !db) return;
      try {
        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);
        const data = snap.exists() ? snap.data() : {};
        if (!mounted) return;
        setUserDoc({
          uid: user.uid,
          displayName: user.displayName || data.displayName || '',
          photoURL: user.photoURL || data.photoURL || '',
          email: user.email || data.email || null,
          phoneNumber: user.phoneNumber || data.phoneNumber || null,
          providerIds: (user.providerData || []).map(p => p.providerId),
          role: data.role || 'user',
          createdAt: toDate(data.createdAt) || null,
          updatedAt: toDate(data.updatedAt) || null,
        });
      } catch (_) {}
      finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [user]);

  const getInitial = () => {
    const basis = (userDoc?.displayName || userDoc?.email || '?').trim();
    return basis.slice(0, 1).toUpperCase();
  };

  const formatMemberSince = () => {
    if (!userDoc?.createdAt) return '—';
    try {
      return formatDate(userDoc.createdAt);
    } catch (_) {
      return '—';
    }
  };

  // Enhanced masking helpers with better security
  const maskEmail = (email) => {
    if (!email) return '—';
    const [name, domain] = String(email).split('@');
    if (!domain) return '—';
    const maskedName = name.length <= 2 ? '*'.repeat(name.length) : name.slice(0, 1) + '*'.repeat(Math.max(2, name.length - 1));
    const domainParts = domain.split('.');
    const maskedDomain = domainParts
      .map((part, idx) => (idx === domainParts.length - 1 ? part : part[0] + '*'.repeat(Math.max(2, part.length - 1))))
      .join('.');
    return `${maskedName}@${maskedDomain}`;
  };

  const maskUid = (uid) => {
    if (!uid) return '—';
    const str = String(uid);
    if (str.length <= 8) return '*'.repeat(str.length);
    return `${str.slice(0, 3)}***${str.slice(-2)}`;
  };

  const maskPhone = (phone) => {
    if (!phone) return '—';
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length < 4) return '***-***-****';
    return `***-***-${digits.slice(-4)}`;
  };

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'moderator': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'premium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default: return 'bg-brand-100 text-brand-800 dark:bg-brand-900/20 dark:text-brand-400';
    }
  };

  const getProviderIcon = (providerId) => {
    switch (providerId) {
      case 'google.com': return '🔍';
      case 'facebook.com': return '📘';
      case 'github.com': return '🐙';
      case 'twitter.com': return '🐦';
      default: return '🔗';
    }
  };

  const InfoRow = ({ label, value, mono = false, icon = null, sensitive = false }) => (
    <div className="group flex items-center justify-between gap-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <div className="flex items-center gap-3">
        {icon && <span className="text-lg">{icon}</span>}
        <span className="font-medium text-slate-600 dark:text-slate-300">{label}</span>
        {sensitive && (
          <button
            onClick={() => setShowSensitiveInfo(!showSensitiveInfo)}
            className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
          >
            {showSensitiveInfo ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      <span className={`truncate max-w-[65%] text-right ${mono ? 'font-mono text-xs' : ''} ${sensitive && !showSensitiveInfo ? 'blur-sm select-none' : ''}`}>
        {value || '—'}
      </span>
    </div>
  );

  const StatCard = ({ title, value, icon, color = 'brand', trend = null }) => (
    <div className={`relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 p-6 bg-gradient-to-br from-${color}-50 to-${color}-100 dark:from-${color}-900/20 dark:to-${color}-800/20 hover:shadow-lg transition-all duration-300 group`}>
      <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
        <div className="text-4xl">{icon}</div>
      </div>
      <div className="relative">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{icon}</span>
          <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">{title}</h3>
        </div>
        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
        {trend && (
          <div className="flex items-center gap-1 mt-2 text-sm">
            <span className={`${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
            </span>
            <span className="text-slate-500">vs last month</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-brand-50/30 to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Enhanced Header Section */}
        <div className="mb-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 via-brand-500 to-brand-700 shadow-2xl">
            {/* Animated background elements */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-xl animate-float"></div>
              <div className="absolute top-0 right-0 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl animate-float-delayed"></div>
              <div className="absolute -bottom-8 left-20 w-72 h-72 bg-brand-300 rounded-full mix-blend-multiply filter blur-xl animate-float"></div>
            </div>
            
            <div className="relative px-8 py-12">
              {isLoading || !userDoc ? (
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-full bg-white/20 animate-pulse" />
                  <div className="flex-1">
                    <div className="h-6 w-48 bg-white/30 rounded animate-pulse mb-3" />
                    <div className="h-4 w-64 bg-white/20 rounded animate-pulse mb-4" />
                    <div className="flex gap-3">
                      <div className="h-6 w-20 bg-white/20 rounded-full animate-pulse" />
                      <div className="h-6 w-24 bg-white/20 rounded-full animate-pulse" />
                      <div className="h-6 w-32 bg-white/20 rounded-full animate-pulse" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                  <div className="flex items-center gap-6">
                    {userDoc.photoURL ? (
                      <div className="relative group">
                        <img 
                          src={userDoc.photoURL} 
                          alt="avatar" 
                          className="w-24 h-24 rounded-full ring-4 ring-white/30 shadow-2xl object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                        <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-emerald-400 ring-4 ring-white shadow-lg flex items-center justify-center">
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-white/20 text-white grid place-items-center text-3xl font-bold ring-4 ring-white/30 shadow-2xl group-hover:scale-105 transition-transform duration-300">
                        {getInitial()}
                      </div>
                    )}
                    <div className="text-white/95">
                      <h1 className="text-3xl font-bold tracking-tight mb-2">{userDoc.displayName || 'Your Profile'}</h1>
                      <p className="text-white/80 text-lg mb-4">{maskEmail(userDoc.email)}</p>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ring-2 ring-white/20 ${getRoleColor(userDoc.role)}`}>
                          <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                          {userDoc.role?.toUpperCase()}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white/90 ring-2 ring-white/20">
                          <span className="text-lg">🔗</span>
                          {(userDoc.providerIds || []).length} Providers
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white/90 ring-2 ring-white/20">
                          <span className="text-lg">📅</span>
                          Member since {formatMemberSince()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="flex flex-col gap-3">
                    <button className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-medium rounded-xl transition-all duration-300 hover:scale-105 backdrop-blur-sm">
                      Edit Profile
                    </button>
                    <button className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white/90 font-medium rounded-xl transition-all duration-300 hover:scale-105 backdrop-blur-sm">
                      Settings
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Content Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Card className="lg:col-span-1">
              <CardContent>
                <div className="space-y-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-12 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="lg:col-span-3">
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : userDoc ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Personal Information Card */}
            <Card className="lg:col-span-1 hover-lift">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className="text-2xl">👤</span>
                  Personal Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <InfoRow 
                    label="Display Name" 
                    value={userDoc.displayName} 
                    icon="🏷️"
                  />
                  <InfoRow 
                    label="Email" 
                    value={showSensitiveInfo ? userDoc.email : maskEmail(userDoc.email)} 
                    icon="📧"
                    sensitive={true}
                  />
                  <InfoRow 
                    label="User ID" 
                    value={showSensitiveInfo ? userDoc.uid : maskUid(userDoc.uid)} 
                    icon="🆔"
                    mono={true}
                    sensitive={true}
                  />
                  <InfoRow 
                    label="Phone" 
                    value={showSensitiveInfo ? userDoc.phoneNumber : maskPhone(userDoc.phoneNumber)} 
                    icon="📱"
                    sensitive={true}
                  />
                  <InfoRow 
                    label="Role" 
                    value={userDoc.role?.toUpperCase()} 
                    icon="🎭"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Account Statistics and Details */}
            <Card className="lg:col-span-3 hover-lift">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className="text-2xl">📊</span>
                  Account Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  <StatCard
                    title="Account Age"
                    value={userDoc.createdAt ? `${Math.floor((new Date() - userDoc.createdAt) / (1000 * 60 * 60 * 24))} days` : '—'}
                    icon="📅"
                    color="blue"
                  />
                  <StatCard
                    title="Last Active"
                    value={userDoc.updatedAt ? formatDate(userDoc.updatedAt) : '—'}
                    icon="🕒"
                    color="green"
                  />
                  <StatCard
                    title="Providers"
                    value={(userDoc.providerIds || []).length}
                    icon="🔗"
                    color="purple"
                  />
                </div>

                {/* Provider Details */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>🔐</span>
                    Connected Providers
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(userDoc.providerIds || []).map((providerId, index) => (
                      <div key={index} className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
                        <span className="text-2xl">{getProviderIcon(providerId)}</span>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100 capitalize">
                            {providerId.replace('.com', '')}
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            Connected
                          </div>
                        </div>
                        <div className="ml-auto">
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 px-2 py-1 text-xs font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-400"></span>
                            Active
                          </span>
                        </div>
                      </div>
                    ))}
                    {(!userDoc.providerIds || userDoc.providerIds.length === 0) && (
                      <div className="col-span-full text-center py-8 text-slate-500 dark:text-slate-400">
                        <span className="text-4xl mb-2 block">🔒</span>
                        <p>No providers connected</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent>
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
                <p className="text-slate-500 text-lg">Loading profile information...</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}


