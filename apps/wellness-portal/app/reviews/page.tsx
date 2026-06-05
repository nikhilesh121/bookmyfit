'use client';
import { useEffect, useState } from 'react';
import { MessageSquareText, Star } from 'lucide-react';
import Shell from '../../components/Shell';
import { api, getPartnerId, getUser } from '../../lib/api';
import { numberValue, WellnessPartnerSummary } from '../../lib/wellness';

type Review = {
  id: string;
  stars: number | string;
  review?: string | null;
  createdAt?: string;
  user?: {
    name?: string | null;
    memberCode?: string | null;
  } | null;
  userName?: string | null;
  memberCode?: string | null;
};

type ReviewsResponse = Review[] | { data?: Review[]; items?: Review[] };

function reviewList(response: ReviewsResponse): Review[] {
  if (Array.isArray(response)) return response;
  return response.data || response.items || [];
}

function formatDate(value?: string) {
  if (!value) return 'Date unavailable';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function RatingStars({ value, size = 15 }: { value: number; size?: number }) {
  const stars = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <div className="flex items-center gap-1" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          size={size}
          fill={index < stars ? '#FBBF24' : 'transparent'}
          style={{ color: index < stars ? '#FBBF24' : 'var(--t3)' }}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const [partner, setPartner] = useState<WellnessPartnerSummary | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const user = getUser();
        const storedPartnerId = getPartnerId();
        const profilePath = user?.role === 'wellness_partner'
          ? '/wellness/me'
          : storedPartnerId
            ? `/wellness/partners/${storedPartnerId}`
            : null;
        if (!profilePath) throw new Error('No wellness partner selected');
        const profile = await api.get<WellnessPartnerSummary>(profilePath);
        setPartner(profile);
        localStorage.setItem('bmf_wellness_partner_id', profile.id);
        const response = await api.get<ReviewsResponse>(`/ratings/wellness/${profile.id}`);
        setReviews(reviewList(response));
      } catch (err: any) {
        setError(err.message || 'Failed to load reviews');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const rating = numberValue(partner?.rating);
  const reviewCount = numberValue(partner?.reviewCount);

  return (
    <Shell title="Reviews">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.12)' }}>
              <Star size={16} fill="#FBBF24" style={{ color: '#FBBF24' }} />
            </div>
            <span className="accent-pill">all time</span>
          </div>
          <div className="flex items-end gap-3">
            <div className="text-3xl font-bold">{reviewCount ? rating.toFixed(1) : '\u2014'}</div>
            {reviewCount > 0 && <RatingStars value={rating} />}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--t2)' }}>Average Rating</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-soft)' }}>
              <MessageSquareText size={16} style={{ color: 'var(--accent)' }} />
            </div>
            <span className="accent-pill">published</span>
          </div>
          <div className="text-3xl font-bold">{reviewCount}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--t2)' }}>Total Reviews</div>
        </div>
      </div>

      {loading && <p style={{ color: 'var(--t2)', fontSize: 13 }}>Loading reviews...</p>}

      {error && !loading && (
        <div className="glass p-6" style={{ borderColor: 'rgba(255,100,100,0.3)' }}>
          <p style={{ color: '#FF6464', fontSize: 14 }}>{error}</p>
        </div>
      )}

      {!loading && !error && reviews.length === 0 && (
        <div className="glass p-12 text-center">
          <MessageSquareText size={24} className="mx-auto mb-3" style={{ color: 'var(--t3)' }} />
          <p style={{ color: 'var(--t2)' }}>No published reviews yet.</p>
        </div>
      )}

      {!loading && !error && reviews.length > 0 && (
        <div className="space-y-3">
          {reviews.map((review) => {
            const name = review.user?.name || review.userName || 'BookMyFit member';
            const memberCode = review.user?.memberCode || review.memberCode;
            const stars = numberValue(review.stars);
            return (
              <article key={review.id} className="glass p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">{name}</div>
                      <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                        {[memberCode, formatDate(review.createdAt)].filter(Boolean).join(' / ')}
                      </div>
                    </div>
                  </div>
                  <RatingStars value={stars} />
                </div>
                {review.review && (
                  <p className="mt-4" style={{ color: 'var(--t2)', fontSize: 13, lineHeight: 1.65 }}>
                    {review.review}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
