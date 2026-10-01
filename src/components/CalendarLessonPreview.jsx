/* eslint-disable react/prop-types -- Calendar passes its existing lesson model directly. */
import { useId, useLayoutEffect, useRef } from 'react';
import { AcademicCapIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { uk, enUS } from 'date-fns/locale';

export default function CalendarLessonPreview({ event, language, weekTheme, onOpen }) {
  const headingId = useId();
  const previewRef = useRef(null);
  const eventId = event?.id;

  // Keep the footer in view, both below the toolbar and when the rail sticks
  // to the top while the schedule scrolls. Long details scroll within the body.
  useLayoutEffect(() => {
    const preview = previewRef.current;
    let frame = null;
    const fitToViewport = () => {
      const top = Math.max(12, preview.getBoundingClientRect().top);
      preview.style.maxHeight = `${Math.max(160, window.innerHeight - top - 16)}px`;
    };
    const onScroll = (scrollEvent) => {
      if (preview.contains(scrollEvent.target) || frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        fitToViewport();
      });
    };
    fitToViewport();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', fitToViewport);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', fitToViewport);
    };
  }, [eventId]);
  const isUkrainian = language === 'uk';
  const labels = isUkrainian ? {
    heading: 'Деталі заняття',
    emptyTitle: 'Заняття під рукою',
    emptyHint: 'Наведіть курсор на заняття або виберіть його клавіатурою, щоб переглянути деталі тут.',
    teacher: 'Викладач',
    date: 'Дата',
    time: 'Час',
    grade: 'Клас',
    type: 'Формат',
    private: 'Індивідуальне заняття',
    paired: 'Парне заняття',
    group: 'Групове заняття',
    capacity: 'Заповненість',
    available: 'Вільних місць',
    topic: 'Тема заняття',
    weekTheme: 'Тема тижня',
    students: 'Учні',
    noStudents: 'Учнів ще не додано.',
    notSet: 'Не визначено',
    open: 'Відкрити заняття'
  } : {
    heading: 'Lesson details',
    emptyTitle: 'Your lesson at a glance',
    emptyHint: 'Hover over a lesson or focus it with your keyboard to view its details here.',
    teacher: 'Teacher',
    date: 'Date',
    time: 'Time',
    grade: 'Class',
    type: 'Format',
    private: 'Private lesson',
    paired: 'Paired lesson',
    group: 'Group lesson',
    capacity: 'Capacity',
    available: 'Available places',
    topic: 'Lesson topic',
    weekTheme: 'Weekly theme',
    students: 'Students',
    noStudents: 'No students added yet.',
    notSet: 'Not set',
    open: 'Open lesson'
  };

  const details = event?.extendedProps;
  const students = details?.students || [];
  const currentCapacity = details?.currentCapacity ?? students.length;
  const maxCapacity = details?.maxCapacity ?? 0;
  const availablePlaces = Math.max(0, maxCapacity - currentCapacity);
  const start = event ? new Date(event.start) : null;
  const end = event?.end ? new Date(event.end) : null;
  const lessonType = maxCapacity === 1 ? labels.private : maxCapacity === 2 ? labels.paired : labels.group;

  return (
    <aside ref={previewRef} className="calendar-preview" aria-labelledby={headingId}>
      <div className="calendar-preview-header">
        <AcademicCapIcon aria-hidden="true" />
        <h3 id={headingId}>{labels.heading}</h3>
      </div>

      {event ? (
        <>
          <div key={event.id} className="calendar-preview-body" tabIndex={0}>
            <div className="calendar-preview-teacher">
              <span
                className="calendar-preview-teacher-dot"
                style={{ backgroundColor: details?.typeDetails?.color || '#6b7280' }}
                aria-hidden="true"
              />
              <span>{details?.typeDetails?.label || labels.teacher}</span>
            </div>

            <dl className="calendar-preview-facts">
              <div className="calendar-preview-fact-wide">
                <dt>{labels.date}</dt>
                <dd>{format(start, 'EEEE, d MMMM yyyy', { locale: isUkrainian ? uk : enUS })}</dd>
              </div>
              <div className="calendar-preview-fact-wide">
                <dt>{labels.time}</dt>
                <dd className="calendar-preview-time">
                  {format(start, 'HH:mm')}{end && ` – ${format(end, 'HH:mm')}`}
                </dd>
              </div>
              <div>
                  <dt>{labels.grade}</dt>
                  <dd>{details?.ageGroup || labels.notSet}</dd>
              </div>
              <div>
                  <dt>{labels.type}</dt>
                  <dd>{lessonType}</dd>
              </div>
              <div>
                  <dt>{labels.capacity}</dt>
                  <dd>{currentCapacity}/{maxCapacity}</dd>
              </div>
              <div>
                  <dt>{labels.available}</dt>
                  <dd>{availablePlaces}</dd>
              </div>
              <div className="calendar-preview-fact-wide">
                <dt>{labels.topic}</dt>
                <dd className="calendar-preview-full-text">{details?.topic?.trim() || labels.notSet}</dd>
              </div>
              {weekTheme && (
                <div className="calendar-preview-fact-wide">
                  <dt>{labels.weekTheme}</dt>
                  <dd className="calendar-preview-full-text">{weekTheme}</dd>
                </div>
              )}
            </dl>

            <section className="calendar-preview-students">
              <h4>{labels.students} <span>({students.length})</span></h4>
              {students.length > 0 ? (
                <ul>
                  {students.map((student, index) => <li key={`${student}-${index}`}>{student}</li>)}
                </ul>
              ) : <p className="calendar-preview-empty-list">{labels.noStudents}</p>}
            </section>
          </div>

          <div className="calendar-preview-footer">
            <button type="button" onClick={() => onOpen(event.id)}>
              <span>{labels.open}</span>
              <ArrowTopRightOnSquareIcon aria-hidden="true" />
            </button>
          </div>
        </>
      ) : (
        <div className="calendar-preview-empty">
          <AcademicCapIcon aria-hidden="true" />
          <h4>{labels.emptyTitle}</h4>
          <p>{labels.emptyHint}</p>
        </div>
      )}
    </aside>
  );
}
