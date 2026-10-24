import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

const imageTypes = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const videoTypes = ['mp4', 'mov', 'avi', 'webm'];

function MaterialViewer({ material }) {
  const [fileUrl, setFileUrl] = useState('');
  const [error, setError] = useState('');

  const ext = material.link?.split('.').pop()?.toLowerCase() || '';
  const isImage = imageTypes.includes(ext);
  const isVideo = videoTypes.includes(ext);
  const isPDF = ext === 'pdf';
  const isDoc = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext);

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    setFileUrl('');
    setError('');

    apiFetch(`/api/files/materials/${material.id}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Could not load this file');
        }
        const blob = await res.blob();
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setFileUrl(objectUrl);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [material.id]);

  return (
    <article className="sc-material">
      <div className="sc-material-head">
        <div>
          <strong>{material.title}</strong>
          {material.content && <p>{material.content}</p>}
        </div>
        {fileUrl ? (
          <a href={fileUrl} download={`${material.title}.${ext}`} className="btn btn-sm btn-secondary">
            Download
          </a>
        ) : (
          <span className="btn btn-sm btn-secondary is-disabled">Loading</span>
        )}
      </div>

      {error && <p className="sc-file-error">{error}</p>}
      {!error && isVideo && fileUrl && <video controls src={fileUrl} />}
      {!error && isPDF && fileUrl && <iframe src={fileUrl} title={material.title} frameBorder="0" />}
      {!error && isImage && fileUrl && <img src={fileUrl} alt={material.title} />}
      {!error && isDoc && (
        <div className="sc-file-link">
          {fileUrl ? (
            <a href={fileUrl} download={`${material.title}.${ext}`}>
              Download {ext.toUpperCase()} file
            </a>
          ) : (
            'Loading file...'
          )}
        </div>
      )}
      {!error && !isVideo && !isPDF && !isImage && !isDoc && (
        <div className="sc-file-link">
          {fileUrl ? (
            <a href={fileUrl} download={`${material.title}.${ext}`}>
              Download file
            </a>
          ) : (
            'Loading file...'
          )}
        </div>
      )}
    </article>
  );
}

export default MaterialViewer;
