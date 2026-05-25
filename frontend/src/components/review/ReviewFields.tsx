import React from 'react';
import { Star } from 'lucide-react';
import { StarRating, FacilityCheckbox } from '../common';
import { REVIEW_CONFIG } from '../../config/constants';
import { FACILITY_CONFIG, RATING_DIMENSIONS } from '../../config/ratings';
import type { ReviewFormController } from '../../hooks/useReviewForm';

type DetailedClasses = {
  section: string;
  sectionTitle: string;
  sectionDescription: string;
  ratingCategories: string;
  ratingCategory: string;
  categoryHeader: string;
  categoryIcon: string;
  categoryInfo: string;
  categoryLabel: string;
  categoryDescription: string;
  checkboxGrid: string;
  textareaContainer: string;
  reviewTextarea: string;
  characterCount: string;
};

type CompactClasses = {
  ratingField: string;
  ratingLabel: string;
  checkboxGrid: string;
  formGroup: string;
  charCount: string;
  optional?: string;
};

type BaseReviewFieldsProps = {
  form: ReviewFormController;
  disabled?: boolean;
  readOnly?: boolean;
  textareaId: string;
  commentRows: number;
  commentPlaceholder?: string;
  commentLabel?: React.ReactNode;
  showCommentCount?: boolean;
};

type ReviewFieldsProps = BaseReviewFieldsProps & (
  | { variant: 'detailed'; classes: DetailedClasses }
  | { variant: 'compact'; classes: CompactClasses }
);

const subRatings = RATING_DIMENSIONS.filter((dimension) => dimension.key !== 'wfc_rating');

const ReviewFields: React.FC<ReviewFieldsProps> = (props) => {
  const {
    form,
    disabled = false,
    readOnly = false,
    textareaId,
    commentRows,
    commentPlaceholder = '',
    showCommentCount = true,
  } = props;

  if (props.variant === 'compact') {
    const { classes } = props;

    return (
      <>
        <div className={classes.ratingField}>
          <label className={classes.ratingLabel}>
            <Star size={18} />
            Overall WFC Rating
            {classes.optional && <span className={classes.optional}>(Auto)</span>}
          </label>
          <StarRating value={form.wfcRating} disabled />
        </div>

        {subRatings.map((dimension) => {
          const value = form.ratingValues[dimension.key];
          const setter = form.ratingSetters[dimension.key];
          if (value === undefined || !setter) return null;

          return (
            <div key={dimension.key} className={classes.ratingField}>
              <label className={classes.ratingLabel}>
                {dimension.icon}
                {dimension.label}
              </label>
              <StarRating value={value} onChange={setter} disabled={disabled} />
            </div>
          );
        })}

        <div className={classes.checkboxGrid}>
          {FACILITY_CONFIG.map((facility) => {
            const checked = form.facilityValues[facility.key];
            const setter = form.facilitySetters[facility.key];
            if (checked === undefined || !setter) return null;

            return (
              <FacilityCheckbox
                key={facility.key}
                label={facility.label}
                icon={facility.icon}
                checked={checked}
                onChange={setter}
                disabled={disabled}
              />
            );
          })}
        </div>

        <div className={classes.formGroup}>
          <label htmlFor={textareaId}>
            {props.commentLabel || `Comment (Optional, max ${REVIEW_CONFIG.MAX_COMMENT_LENGTH} chars)`}
          </label>
          <textarea
            id={textareaId}
            value={form.comment}
            onChange={(event) => form.setComment(event.target.value)}
            placeholder={commentPlaceholder}
            maxLength={REVIEW_CONFIG.MAX_COMMENT_LENGTH}
            rows={commentRows}
            disabled={disabled}
            readOnly={readOnly}
          />
          {showCommentCount && (
            <div className={classes.charCount}>
              {form.comment.length}/{REVIEW_CONFIG.MAX_COMMENT_LENGTH}
            </div>
          )}
        </div>
      </>
    );
  }

  const { classes } = props;

  return (
    <>
      <div className={classes.section}>
        <h3 className={classes.sectionTitle}>Key WFC Criteria</h3>
        <p className={classes.sectionDescription}>
          Rate the most important aspects for working from this cafe
        </p>

        <div className={classes.ratingCategories}>
          {subRatings.map((dimension) => {
            const value = form.ratingValues[dimension.key];
            const setter = form.ratingSetters[dimension.key];
            if (value === undefined || !setter) return null;

            return (
              <div key={dimension.key} className={classes.ratingCategory}>
                <div className={classes.categoryHeader}>
                  <div className={classes.categoryIcon}>{dimension.icon}</div>
                  <div className={classes.categoryInfo}>
                    <h4 className={classes.categoryLabel}>{dimension.label}</h4>
                    {dimension.description && (
                      <p className={classes.categoryDescription}>{dimension.description}</p>
                    )}
                  </div>
                </div>
                <StarRating value={value} onChange={setter} disabled={disabled} />
              </div>
            );
          })}
        </div>
      </div>

      <div className={classes.section}>
        <h3 className={classes.sectionTitle}>Overall WFC Suitability</h3>
        <p className={classes.sectionDescription}>Auto-calculated from your ratings above</p>
        <div className={classes.ratingCategory}>
          <StarRating value={form.wfcRating || 3} disabled />
        </div>
      </div>

      <div className={classes.section}>
        <h3 className={classes.sectionTitle}>Additional Facilities</h3>
        <p className={classes.sectionDescription}>Does the cafe have these amenities?</p>

        <div className={classes.checkboxGrid}>
          {FACILITY_CONFIG.map((facility) => {
            const setter = form.facilitySetters[facility.key];
            const checked = form.facilityValues[facility.key] ?? false;
            if (!setter) return null;

            return (
              <FacilityCheckbox
                key={facility.key}
                label={facility.label}
                icon={facility.icon}
                checked={checked}
                onChange={setter}
                disabled={disabled}
              />
            );
          })}
        </div>
      </div>

      <div className={classes.section}>
        <label htmlFor={textareaId} className={classes.sectionTitle}>
          {props.commentLabel || 'Your Review'}
        </label>
        <div className={classes.textareaContainer}>
          <textarea
            id={textareaId}
            className={classes.reviewTextarea}
            placeholder={commentPlaceholder}
            value={form.comment}
            onChange={(event) => form.setComment(event.target.value)}
            rows={commentRows}
            maxLength={REVIEW_CONFIG.MAX_COMMENT_LENGTH}
            disabled={disabled}
            readOnly={readOnly}
          />
          {showCommentCount && (
            <p className={classes.characterCount}>
              {form.comment?.length || 0} / {REVIEW_CONFIG.MAX_COMMENT_LENGTH}
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default ReviewFields;
