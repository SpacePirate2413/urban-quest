import { MessageSquare, Star, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card } from '../../components/ui';
import { api } from '../../services/api';
import { useWriterStore } from '../../store/useWriterStore';

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= Math.round(rating)
              ? 'text-yellow fill-yellow'
              : 'text-white/20'
          }`}
        />
      ))}
    </div>
  );
}

export function QuestReviews({ questId }) {
  const { quests } = useWriterStore();
  const quest = quests.find((q) => q.id === questId);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!questId) return;
    setIsLoading(true);
    api
      .getQuestReviews(questId)
      .then((data) => {
        setReviews(data.reviews || []);
        setAverageRating(data.averageRating || 0);
        setTotalReviews(data.totalReviews || 0);
      })
      .catch((err) => {
        console.error('Failed to load reviews:', err);
      })
      .finally(() => setIsLoading(false));
  }, [questId]);

  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    percentage:
      totalReviews > 0
        ? (reviews.filter((r) => r.rating === star).length / totalReviews) * 100
        : 0,
  }));

  if (!quest) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Star className="w-5 h-5 text-yellow" />
          <h3 className="font-bangers text-xl text-white">Reviews & Ratings</h3>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-sm text-white/50">Loading reviews...</p>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-8 mb-6">
              <div className="text-center">
                <p className="font-bangers text-5xl text-yellow">
                  {averageRating > 0 ? averageRating.toFixed(1) : '—'}
                </p>
                <StarRating rating={averageRating} />
                <p className="text-xs text-white/50 mt-1">
                  {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
                </p>
              </div>

              <div className="flex-1 space-y-1.5">
                {ratingDistribution.map(({ star, count, percentage }) => (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-xs text-white/70 w-3">{star}</span>
                    <Star className="w-3 h-3 text-yellow fill-yellow" />
                    <div className="flex-1 h-2 bg-panel-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-white/50 w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {reviews.length === 0 ? (
              <div className="text-center py-8 border-t border-panel-border">
                <MessageSquare className="w-10 h-10 text-white/20 mx-auto mb-2" />
                <p className="text-sm text-white/50">No reviews yet</p>
                <p className="text-xs text-white/40 mt-1">
                  Reviews will appear here once players rate your quest.
                </p>
              </div>
            ) : (
              <div className="space-y-4 border-t border-panel-border pt-4">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="p-4 bg-input-bg rounded-lg border border-panel-border"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {review.user?.avatarUrl ? (
                          <img
                            src={review.user.avatarUrl}
                            alt={review.user.name}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-panel-border flex items-center justify-center">
                            <Users className="w-4 h-4 text-white/50" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-white font-medium">
                            {review.user?.name || 'Anonymous'}
                          </p>
                          <StarRating rating={review.rating} />
                        </div>
                      </div>
                      <p className="text-xs text-white/40">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-white/70 mt-2">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

export default QuestReviews;
