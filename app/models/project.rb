class Project < ApplicationRecord
  STATUSES = {
    active: 0,
    paused: 1,
    completed: 2,
    archived: 3
  }.freeze

  belongs_to :user

  enum :status, STATUSES

  validates :name, presence: true, length: { maximum: 120 }
  validates :description, length: { maximum: 2_000 }
  validates :last_activity_at, presence: true

  before_validation :default_last_activity_at
  before_save :record_completion_activity

  scope :recent, -> { order(last_activity_at: :desc, created_at: :desc) }

  def archive!
    update!(status: :archived, last_activity_at: Time.current)
  end

  private

    def default_last_activity_at
      self.last_activity_at ||= Time.current
    end

    def record_completion_activity
      return unless will_save_change_to_status? && completed?
      return if will_save_change_to_last_activity_at?

      self.last_activity_at = Time.current
    end
end
