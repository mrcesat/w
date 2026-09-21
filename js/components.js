const BASE_PATH = window.location.pathname.includes('/cases/') ? '../' : './';
const SITE_ROOT = '/w/';

async function loadComponent(selector, url, params = {}) {
    try {
        const fullPath = BASE_PATH + url;
        const response = await fetch(fullPath);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${fullPath}`);

        let html = await response.text();
        Object.keys(params).forEach(key => {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            html = html.replace(regex, params[key]);
        });

        const element = document.querySelector(selector);
        if (element) {
            element.innerHTML = html;
            console.log(`Компонент загружен: ${selector}`);
        }
    } catch (error) {
        console.error(`Ошибка загрузки ${url}:`, error);
    }
}

function generateCategoryNav(categories, activeCategory) {
    const navContainer = document.getElementById('category-nav') || document.querySelector('.category-switcher');
    if (!navContainer) return;

    let html = '';
    const allActive = !activeCategory ? 'active' : '';
    html += `<a href="index.html" class="switcher-link switcher-all ${allActive}">X</a>`;

    Object.keys(categories).forEach(key => {
        const isActive = activeCategory === key ? 'active' : '';
        html += `<a href="index.html?category=${key}" class="switcher-link ${isActive}">${categories[key]}</a>`;
    });

    navContainer.innerHTML = html;
}

async function renderProjectsList(activeCategory = null) {
    const container = document.querySelector('.projects-list');
    if (!container) return;

    try {
        const response = await fetch(BASE_PATH + 'projects-data.json');
        const data = await response.json();

        let projects = data.projects;
        if (activeCategory) {
            projects = projects.filter(project =>
                project.categories && project.categories.includes(activeCategory)
            );
            console.log(`Отфильтровано: ${projects.length} проектов в категории "${activeCategory}"`);
        } else {
            console.log(`Все проекты: ${projects.length}`);
        }

        if (projects.length === 0) {
            container.innerHTML = '<p style="padding: 32px; color: #888;">В этой категории пока нет проектов.</p>';
            return;
        }

        let html = '';

        projects.forEach((project, index) => {
            let slidesHtml = '';
            project.media.forEach((item, slideIndex) => {
                const activeClass = slideIndex === 0 ? 'active' : '';
                if (item.type === 'video') {
                    slidesHtml += `
                        <div class="media-slide ${activeClass}">
                            <video autoplay muted loop playsinline>
                                <source src="${item.src}" type="video/mp4">
                            </video>
                        </div>`;
                } else {
                    slidesHtml += `
                        <div class="media-slide ${activeClass}">
                            <img src="${item.src}" alt="${item.alt || project.title}">
                        </div>`;
                }
            });

            let roleHtml = '';
            if (project.role) {
                roleHtml += `<p class="role-text">${project.role}</p>`;
            }

            let softHtml = '';
            if (project.soft && project.soft.length > 0) {
                softHtml += `<div class="soft-list"><ul>`;
                project.soft.forEach(item => {
                    softHtml += `<li>${item}</li>`;
                });
                softHtml += `</ul></div>`;
            }

            const mediaMode = project.mediaMode || 'contain';
            let mediaClass = 'media-fit-contain';
            if (mediaMode === 'cover') mediaClass = 'media-fit-cover';
            else if (mediaMode === 'grid') mediaClass = 'media-fit-grid';

            html += `
            <article class="project-item" data-project-bg="${project.bgColor}">
                <div class="marquee-container">
                    <div class="marquee-content">
                        <span>${project.title}</span>
                        <span>${project.title}</span>
                        <span>${project.title}</span>
                    </div>
                </div>
                <a href="${project.link}" class="project-content-link">
                    <div class="project-content">
                        <div class="project-media-player ${mediaClass}" style="background: ${project.bgColor}; height: ${project.playerHeight || 400}px;">
                            <div class="media-stage">
                                <div class="media-slider" data-player-id="player-${index}">
                                    ${slidesHtml}
                                </div>
                            </div>
                            <div class="player-zone player-zone-left" data-player-id="player-${index}"></div>
                            <div class="player-zone player-zone-right" data-player-id="player-${index}"></div>
                        </div>
                        <div class="project-description">
                            <p>${project.description.replace(/\n/g, '<br>')}</p>
                            ${roleHtml}
                            ${softHtml}
                        </div>
                    </div>
                </a>
            </article>
            `;
        });

        container.innerHTML = html;
        console.log(`Сгенерировано ${projects.length} проектов`);

        setTimeout(() => {
            console.log(' Запуск инициализации плееров...');
            initAllPlayers(true);
            initMarquees();
        }, 300);

    } catch (error) {
        console.error('Ошибка загрузки проектов:', error);
    }
}

function initMarquees() {
    const marquees = document.querySelectorAll('.marquee-container');
    const SPEED = 40;

    marquees.forEach(container => {
        const content = container.querySelector('.marquee-content');
        if (!content) return;

        const originalHTML = content.innerHTML;
        content.innerHTML = originalHTML + originalHTML + originalHTML + originalHTML;

        const totalWidth = content.scrollWidth;
        const singleWidth = totalWidth / 4;

        content.innerHTML = originalHTML + originalHTML;
        const duration = singleWidth / SPEED;
        content.style.animation = `marquee-scroll ${duration}s linear infinite`;
    });
}

if (!document.getElementById('marquee-keyframes')) {
    const style = document.createElement('style');
    style.id = 'marquee-keyframes';
    style.textContent = `
        @keyframes marquee-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }
    `;
    document.head.appendChild(style);
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Загрузка компонентов...');

    mountGlobalOverlay();

    loadComponent('.left-panel', 'components/left-panel.html');

    const isProjectView = document.body.classList.contains('project-view-page');
    const isProjectsPage = document.querySelector('.projects-list') !== null;

    if (isProjectView) {
        const body = document.body;
        const projectConfig = {
            'project-title': body.dataset.projectTitle || 'Название проекта',
            'project-description': body.dataset.projectDescription || 'Описание проекта',
            'project-role': body.dataset.projectRole || 'Роль не указана',
            'project-color': body.dataset.projectColor || '#000000',
            'media-mode': body.dataset.mediaMode || 'contain'
        };

        let softBlockHtml = '';
        const projectSoft = body.dataset.projectSoft;
        if (projectSoft) {
            const softArray = projectSoft.split(',').map(s => s.trim());
            softBlockHtml = `<div class="soft-list"><ul>`;
            softArray.forEach(item => {
                softBlockHtml += `<li>${item}</li>`;
            });
            softBlockHtml += `</ul></div>`;
        }

        let workflowBlockHtml = '';
        const projectWorkflow = body.dataset.projectWorkflow;
        if (projectWorkflow) {
            try {
                const workflowData = JSON.parse(projectWorkflow);
                if (workflowData && workflowData.length > 0) {
                    workflowBlockHtml += '<div class="workflow-section"><h3 class="workflow-title">Roadmap</h3><div class="workflow-diagram">';
                    workflowData.forEach((block, index) => {
                        workflowBlockHtml += `
                            <div class="workflow-block">
                                <div class="workflow-block-content">
                                    <span class="workflow-step">${block.step}</span>
                                    <h4 class="workflow-block-title">${block.title}</h4>
                                    ${block.description ? `<p class="workflow-block-desc">${block.description}</p>` : ''}
                                </div>
                            </div>
                        `;
                        if (index < workflowData.length - 1) {
                            workflowBlockHtml += '<div class="workflow-connector"></div>';
                        }
                    });
                    workflowBlockHtml += '</div></div>';
                }
            } catch (e) {
                console.error('Ошибка парсинга workflow:', e);
            }
        }

        loadComponent('.category-switcher', 'components/category-nav.html');

        loadComponent('.project-header', 'components/project-header.html', {
            'project-title': projectConfig['project-title']
        }).then(() => {
            setTimeout(() => initMarquees(), 50);
        });

        loadComponent('.project-description-block', 'components/project-description.html', {
            'project-description': projectConfig['project-description'],
            'project-role': projectConfig['project-role'],
            'project-soft-block': softBlockHtml,
            'project-workflow-block': workflowBlockHtml
        });

        if (projectConfig['project-color']) {
            document.body.style.setProperty('--project-bg', projectConfig['project-color']);
            console.log(`Цвет установлен: ${projectConfig['project-color']}`);
        }

    } else if (isProjectsPage) {
        const urlParams = new URLSearchParams(window.location.search);
        const activeCategory = urlParams.get('category');

        console.log(`Активная категория: ${activeCategory || 'все'}`);

        fetch(BASE_PATH + 'projects-data.json')
            .then(r => r.json())
            .then(data => {
                generateCategoryNav(data.categories, activeCategory);
                renderProjectsList(activeCategory);
            })
            .catch(err => console.error('Ошибка:', err));
    }

    console.log('Инициализация завершена');
});

// ============================================
// ГЛОБАЛЬНЫЙ SVG-ОВЕРЛЕЙ (внизу экрана, поверх всего)
// ============================================
async function mountGlobalOverlay() {
    if (document.getElementById('global-overlay')) return;
    try {
        const res = await fetch(SITE_ROOT + 'splash.svg');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const svgText = await res.text();
        document.body.insertAdjacentHTML(
            'beforeend',
            `<a id="global-overlay" class="global-overlay"
                href="https://t.me/mrcecv"
                aria-label="link">${svgText}</a>`
        );
    } catch (e) {
        console.error('Не удалось загрузить splash.svg:', e);
    }
}
